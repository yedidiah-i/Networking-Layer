// networking_layer\src\node_discovery\mod.rs

use std::net::SocketAddr;
use sha2::{Digest, Sha256};
use crate::network_framework::PeerId;

#[derive(Debug, Clone, Copy)]
pub struct PeerRoutingNode {
    pub peer_id: PeerId,
    pub address: SocketAddr,
    pub distance_metric: u32,
}

pub struct KademliaRoutingTable {
    local_id: PeerId,
    buckets: Vec<Vec<PeerRoutingNode>>,
    pow_difficulty_target: u32,
}

impl KademliaRoutingTable {
    pub fn new(local_id: PeerId, difficulty: u32) -> Self {
        Self {
            local_id,
            buckets: vec![Vec::new(); 256],
            pow_difficulty_target: difficulty,
        }
    }

    pub fn verify_peer_pow(&self, peer_id: PeerId, nonce: u64) -> bool {
        let mut hasher = Sha256::new();
        hasher.update(peer_id);
        hasher.update(nonce.to_be_bytes());
        let result = hasher.finalize();
        
        let leading_zeros = result.iter()
            .map(|b| b.leading_zeros())
            .take_while(|&z| z == 8)
            .count() * 8;
            
        let extra_bits = result.get(leading_zeros / 8)
            .map(|b| b.leading_zeros())
            .unwrap_or(0) as usize;
            
        (leading_zeros + extra_bits) >= self.pow_difficulty_target as usize
    }

    pub async fn insert_verified_peer(&mut self, node: PeerRoutingNode) {
        let bucket_idx = self.calculate_xor_index(&node.peer_id);
        
        {
            let bucket = &mut self.buckets[bucket_idx];
            if let Some(pos) = bucket.iter().position(|p| p.peer_id == node.peer_id) {
                let mut existing_node = bucket.remove(pos);
                existing_node.address = node.address;
                bucket.push(existing_node);
                return;
            }
            
            if bucket.len() < 20 {
                bucket.push(node);
                return;
            }
        } 


        let oldest_peer = self.buckets[bucket_idx][0];
        let is_alive = self.ping_peer(&oldest_peer).await;

        let bucket = &mut self.buckets[bucket_idx];
        if is_alive {
            let alive_peer = bucket.remove(0);
            bucket.push(alive_peer);
        } else {
            bucket.remove(0);
            bucket.push(node);
        }
    }
    pub fn calculate_xor_distance_bucket(&self, target_id: &PeerId) -> usize {
        // Iterate through all 32 bytes to find the leading bit difference
        for i in 0..32 {
            let xor_byte = self.local_id[i] ^ target_id[i];
            if xor_byte != 0 {
                // Find the exact bit-level offset to accurately allocate to one of our 256 buckets
                let leading_zeros = xor_byte.leading_zeros() as usize;
                return (i * 8) + leading_zeros;
            }
        }
        0 // Returns 0 if IDs are mathematically identical (self lookup)
    }
    async fn ping_peer(&self, _peer_id: &PeerRoutingNode) -> bool {
        true
    }

    pub fn calculate_xor_index(&self, peer_id: &PeerId) -> usize {
        (peer_id[0] ^ self.local_id[0]) as usize
    }
}
