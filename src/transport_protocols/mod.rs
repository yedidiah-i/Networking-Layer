// networking_layer\src\transport_protocols\mod.rs

use std::pin::Pin;
use std::task::{Context, Poll};
use tokio::io::{AsyncRead, AsyncWrite, ReadBuf};
use tokio::net::TcpStream;
use tokio_tungstenite::WebSocketStream;
use tokio_tungstenite::MaybeTlsStream;
use tokio_tungstenite::tungstenite::Message;
use quinn::{SendStream, RecvStream};

// SAFETY & SIMPLICITY: Direct standard paths ensuring full feature compatibility
use futures_core::stream::Stream;
use futures_sink::Sink;

pub enum RawWireStream {
    Tcp(TcpStream),
    Quic {
        send: SendStream,
        recv: RecvStream,
    },
    WebSocket {
        stream: WebSocketStream<MaybeTlsStream<TcpStream>>,
        read_buffer: Vec<u8>,
    },
}

impl AsyncRead for RawWireStream {
    fn poll_read(
        mut self: Pin<&mut Self>,
        cx: &mut Context<'_>,
        buf: &mut ReadBuf<'_>,
    ) -> Poll<std::io::Result<()>> {
        match &mut *self {
            RawWireStream::Tcp(stream) => Pin::new(stream).poll_read(cx, buf),
            RawWireStream::Quic { recv, .. } => Pin::new(recv).poll_read(cx, buf),
            RawWireStream::WebSocket { stream, read_buffer } => {
                if !read_buffer.is_empty() {
                    let to_read = std::cmp::min(read_buffer.len(), buf.remaining());
                    let drained: Vec<u8> = read_buffer.drain(..to_read).collect();
                    buf.put_slice(&drained);
                    return Poll::Ready(Ok(()));
                }

                match Pin::new(stream).poll_next(cx) {
                    Poll::Ready(Some(Ok(msg))) => {
                        match msg {
                            Message::Binary(data) => {
                                if data.is_empty() {
                                    return Poll::Ready(Ok(()));
                                }
                                let to_read = std::cmp::min(data.len(), buf.remaining());
                                buf.put_slice(&data[..to_read]);
                                
                                if to_read < data.len() {
                                    read_buffer.extend_from_slice(&data[to_read..]);
                                }
                                Poll::Ready(Ok(()))
                            }
                            Message::Close(_) => Poll::Ready(Ok(())),
                            _ => Poll::Ready(Ok(())),
                        }
                    }
                    Poll::Ready(Some(Err(e))) => Poll::Ready(Err(std::io::Error::new(std::io::ErrorKind::ConnectionReset, e))),
                    Poll::Ready(None) => Poll::Ready(Ok(())),
                    Poll::Pending => Poll::Pending,
                }
            }
        }
    }
}

impl AsyncWrite for RawWireStream {
    fn poll_write(
        mut self: Pin<&mut Self>,
        cx: &mut Context<'_>,
        buf: &[u8],
    ) -> Poll<std::io::Result<usize>> {
        match &mut *self {
            RawWireStream::Tcp(stream) => Pin::new(stream).poll_write(cx, buf),
            RawWireStream::Quic { send, .. } => {
                Pin::new(send).poll_write(cx, buf).map_err(|e| {
                    std::io::Error::new(std::io::ErrorKind::ConnectionAborted, e)
                })
            }
            RawWireStream::WebSocket { stream, .. } => {
                let item = Message::Binary(buf.to_vec().into());
                match Pin::new(&mut *stream).poll_ready(cx) {
                    Poll::Ready(Ok(())) => {
                        match Pin::new(stream).start_send(item) {
                            Ok(()) => Poll::Ready(Ok(buf.len())),
                            Err(e) => Poll::Ready(Err(std::io::Error::new(std::io::ErrorKind::WriteZero, e))),
                        }
                    }
                    Poll::Ready(Err(e)) => Poll::Ready(Err(std::io::Error::new(std::io::ErrorKind::ConnectionAborted, e))),
                    Poll::Pending => Poll::Pending,
                }
            }
        }
    }

    fn poll_flush(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<std::io::Result<()>> {
        match &mut *self {
            RawWireStream::Tcp(stream) => Pin::new(stream).poll_flush(cx),
            RawWireStream::Quic { send, .. } => Pin::new(send).poll_flush(cx).map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e)),
            RawWireStream::WebSocket { stream, .. } => Pin::new(stream).poll_flush(cx).map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e)),
        }
    }

    fn poll_shutdown(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<std::io::Result<()>> {
        match &mut *self {
            RawWireStream::Tcp(stream) => Pin::new(stream).poll_shutdown(cx),
            RawWireStream::Quic { send, .. } => Pin::new(send).poll_shutdown(cx).map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e)),
            RawWireStream::WebSocket { stream, .. } => Pin::new(stream).poll_close(cx).map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e)),
        }
    }
}
