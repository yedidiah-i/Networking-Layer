// networking_layer\src\network_framework\mod.rs

use std::{collections::HashMap, net::SocketAddr, sync::Arc};
use tokio::sync::RwLock;
use tokio::net::TcpListener;
use tokio_tungstenite::MaybeTlsStream;
use crate::transport_protocols::RawWireStream;

pub type SessionTicket = [u8; 32];
pub type PeerId = [u8; 32];

pub struct NetworkFrameworkManager {
    active_connections: Arc<RwLock<HashMap<PeerId, RawWireStream>>>,
    session_ticket_cache: Arc<RwLock<HashMap<PeerId, (SocketAddr, SessionTicket)>>>,
}

impl NetworkFrameworkManager {
    pub fn new() -> Self {
        Self {
            active_connections: Arc::new(RwLock::new(HashMap::new())),
            session_ticket_cache: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn handle_incoming_quic_connections(&self, endpoint: quinn::Endpoint) {
        while let Some(incoming) = endpoint.accept().await {
            tokio::spawn(async move {
                if let Ok(conn) = incoming.await {
                    if let Ok((send, recv)) = conn.accept_bi().await {
                        let _wire_stream = RawWireStream::Quic { send, recv };
                    }
                }
            });
        }
    }

    pub async fn accept_incoming_tcp_or_ws(&self, listener: TcpListener) -> Result<(), String> {
        while let Ok((socket, _addr)) = listener.accept().await {
            let mut prefix_buffer = [0u8; 4];
            if socket.peek(&mut prefix_buffer).await.is_err() {
                continue; 
            }

            if &prefix_buffer[..4] == b"GET " {
                tokio::spawn(async move {
                    // Wrap the Plain TCP socket cleanly into a MaybeTlsStream container structure
                    let tls_wrapped = MaybeTlsStream::Plain(socket);
                    if let Ok(ws_stream) = tokio_tungstenite::accept_async(tls_wrapped).await {
                        let _wire_stream = RawWireStream::WebSocket {
                            stream: ws_stream,
                            read_buffer: Vec::new(),
                        };
                    }
                });
            } else {
                let _wire_stream = RawWireStream::Tcp(socket);
            }
        }
        Ok(())
    }

    pub async fn negotiate_0rtt_session(
        &self,
        peer: PeerId,
        provided_ticket: Option<SessionTicket>
    ) -> Result<bool, String> {
        let cache = self.session_ticket_cache.read().await;
        if let Some(ticket) = provided_ticket {
            if let Some((_, cached_ticket)) = cache.get(&peer) {
                if *cached_ticket == ticket {
                    return Ok(true);
                }
            }
        }
        Ok(false)
    }

    pub async fn register_session(&self, peer: PeerId, addr: SocketAddr, ticket: SessionTicket) {
        let mut cache = self.session_ticket_cache.write().await;
        cache.insert(peer, (addr, ticket));
    }
}
