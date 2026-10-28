// networking_layer\src\connection_handling\nat_traversal.rs

use std::net::{Ipv4Addr, SocketAddr};
use std::time::Duration;
use tokio::net::UdpSocket;
use tokio::time::timeout;

pub struct NatTraversal;

impl NatTraversal {
    /// DISCOVERY SPEED: Resolves the public IP and Port from a STUN server 
    /// using a raw UDP transaction with strict execution bounds.
    pub async fn discover_public_address(
        socket: &UdpSocket, 
        stun_server: SocketAddr
    ) -> Result<SocketAddr, String> {
        // Construct a minimalistic STUN Binding Request Header (RFC 5389)
        let mut stun_request = [0u8; 20];
        stun_request[0..2].copy_from_slice(&0x0001u16.to_be_bytes()); // Binding Request
        stun_request[4..8].copy_from_slice(&0x2112A442u32.to_be_bytes()); // Magic Cookie
        
        // Populate random 12-byte Transaction ID for cryptographic safety match
        let transaction_id: [u8; 12] = rand::random();
        stun_request[8..20].copy_from_slice(&transaction_id);

        // SPEED & SAFETY: Bound network transmission within a strict timeout window
        timeout(Duration::from_millis(800), async {
            socket.send_to(&stun_request, stun_server).await
                .map_err(|e| format!("STUN transmit failure: {}", e))?;

            let mut response_buf = [0u8; 512];
            let (len, from) = socket.recv_from(&mut response_buf).await
                .map_err(|e| format!("STUN receive failure: {}", e))?;

            if from != stun_server || len < 20 {
                return Err("Forged or truncated STUN response dropped".to_string());
            }

            // Verify Transaction ID alignment to block injection attacks
            if response_buf[8..20] != transaction_id {
                return Err("Transaction ID verification mismatch".to_string());
            }

            // Parse XOR-MAPPED-ADDRESS attributes
            let mut cursor = 20;
            while cursor + 4 <= len {
                let attr_type = u16::from_be_bytes([response_buf[cursor], response_buf[cursor + 1]]);
                let attr_len = u16::from_be_bytes([response_buf[cursor + 2], response_buf[cursor + 3]]) as usize;
                cursor += 4;

                if attr_type == 0x0020 { // XOR-MAPPED-ADDRESS Attribute Type
                    if cursor + attr_len > len || attr_len < 8 { return Err("Malformed STUN attribute".to_string()); }
                    let family = response_buf[cursor + 1];
                    let xor_port = u16::from_be_bytes([response_buf[cursor + 2], response_buf[cursor + 3]]);
                    let port = xor_port ^ 0x2112; // Unmask Port using Magic Cookie high bytes
                    
                    if family == 0x01 { // IPv4
                        let mut ip_bytes = [0u8; 4];
                        ip_bytes.copy_from_slice(&response_buf[cursor + 4..cursor + 8]);
                        // Unmask IP using the standard Magic Cookie
                        let magic_bytes = 0x2112A442u32.to_be_bytes();
                        for i in 0..4 { ip_bytes[i] ^= magic_bytes[i]; }
                        
                        return Ok(SocketAddr::new(std::net::IpAddr::V4(ip_bytes.into()), port));
                    }
                }
                cursor += attr_len;
            }
            Err("No valid public mapping attribute found".to_string())
        })
        .await
        .map_err(|_| "STUN server response timed out".to_string())?

    }
    pub async fn broadcast_local_presence(local_port: u16, peer_id: [u8; 32]) -> Result<(), String> {
        let multicast_addr = Ipv4Addr::new(224, 0, 0, 251); // mDNS multicast space
        let bind_addr = SocketAddr::new(std::net::IpAddr::V4(Ipv4Addr::UNSPECIFIED), 5353);
        
        let socket = UdpSocket::bind(bind_addr).await
            .map_err(|e| format!("Failed binding multicast discovery receiver: {}", e))?;
            
        // Explicitly join the local area interface multicast group container
        socket.join_multicast_v4(multicast_addr, Ipv4Addr::UNSPECIFIED)
            .map_err(|e| format!("Failed to join local multicast ring: {}", e))?;

        // Construct discovery signal payload containing our local node attributes
        let mut discovery_packet = Vec::with_capacity(34);
        discovery_packet.extend_from_slice(b"P2P_DISCOVER");
        discovery_packet.extend_from_slice(&peer_id);
        
        // Fire broadcast query frame across local routers
        let target_broadcast = SocketAddr::new(std::net::IpAddr::V4(multicast_addr), 5353);
        socket.send_to(&discovery_packet, target_broadcast).await
            .map_err(|e| format!("Failed to emit discovery beacon frame: {}", e))?;
            
        Ok(())
    }

    /// HOLE PUNCHING SPEED: Simultaneously blasts boundary synchronization tokens 
    /// at the destination node firewall mapping to establish state persistence.
    pub async fn punch_hole(socket: &UdpSocket, remote_addr: SocketAddr) {
        let punch_token = b"PUNCH_OPEN";
        // Burst localized probes to open an outbound port translation frame quickly
        for _ in 0..4 {
            let _ = socket.send_to(punch_token, remote_addr).await;
            tokio::time::sleep(Duration::from_millis(15)).await;
        }
    }
}
