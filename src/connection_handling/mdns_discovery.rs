// networking_layer\src\node_discovery\mdns_discovery.rs

use std::net::{Ipv4Addr, SocketAddr};
use std::time::Duration;
use tokio::net::UdpSocket;
use crate::network_framework::PeerId;
use crate::node_discovery::PeerRoutingNode;

pub struct LocalMdnsDiscovery {
    local_id: PeerId,
    local_port: u16,
}

impl LocalMdnsDiscovery {
    pub fn new(local_id: PeerId, local_port: u16) -> Self {
        Self { local_id, local_port }
    }

    /// SPEED & SIMPLICITY: Background daemon task that listens for incoming local multi-cast pings
    /// and immediately populates discovered peers back into your framework channel.
    pub async fn start_listener_loop(
        self,
        discovered_peer_tx: tokio::sync::mpsc::Sender<PeerRoutingNode>,
    ) -> Result<(), String> {
        let multicast_ip = Ipv4Addr::new(224, 0, 0, 251); // Canonical mDNS IP Group
        let bind_addr = SocketAddr::new(std::net::IpAddr::V4(Ipv4Addr::UNSPECIFIED), 5353);

        // Bind standard reusable UDP Socket
        let socket = UdpSocket::bind(bind_addr).await
            .map_err(|e| format!("mDNS Bind Error: {}", e))?;

        // SAFETY: Join the multicast group on the local subnet interface frame
        socket.join_multicast_v4(multicast_ip, Ipv4Addr::UNSPECIFIED)
            .map_err(|e| format!("Failed to join local multicast group: {}", e))?;

        let mut buffer = [0u8; 1024];

        loop {
            if let Ok((len, remote_sender)) = socket.recv_from(&mut buffer).await {
                // SECURITY: Ignore frames that are too small or lack our network framing header token
                if len < 44 || &buffer[..12] != b"P2P_DISCOVER" {
                    continue;
                }

                let mut peer_id = [0u8; 32];
                peer_id.copy_from_slice(&buffer[12..44]);

                // SECURITY: Do not insert ourselves if we intercept our own reflected broadcast
                if peer_id == self.local_id {
                    continue;
                }

                // Map target peer properties smoothly 
                let discovered_node = PeerRoutingNode {
                    peer_id,
                    address: SocketAddr::new(remote_sender.ip(), self.local_port),
                    distance_metric: 0, // Local hops evaluate distance metrics dynamically as 0
                };

                // Dispatch to the main Network Manager context
                let _ = discovered_peer_tx.send(discovered_node).await;
            }
        }
    }

    /// SPEED: Periodically signals availability outward onto the local network interface pool.
    pub async fn start_broadcast_loop(&self) -> Result<(), String> {
        let multicast_target = SocketAddr::new(std::net::IpAddr::V4(Ipv4Addr::new(224, 0, 0, 251)), 5353);
        
        // Use an ephemeral port for broadcasting outbound queries
        let socket = UdpSocket::bind("0.0.0.0:0").await
            .map_err(|e| format!("Failed to bind mDNS broadcaster socket: {}", e))?;

        let mut payload = Vec::with_capacity(44);
        payload.extend_from_slice(b"P2P_DISCOVER");
        payload.extend_from_slice(&self.local_id);

        loop {
            let _ = socket.send_to(&payload, multicast_target).await;
            tokio::time::sleep(Duration::from_secs(10)).await; // Repeat beacon pulse every 10s
        }
    }
}
