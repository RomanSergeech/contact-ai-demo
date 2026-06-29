#!/usr/bin/env python3
"""
Минимальный SOCKS5-прокси без аутентификации.
Запуск: python3 socks5_proxy.py [--host 0.0.0.0] [--port 1080]
"""
import argparse
import select
import socket
import socketserver
import struct


class Socks5Handler(socketserver.BaseRequestHandler):
    def handle(self) -> None:
        try:
            self._socks5()
        except Exception:
            pass
        finally:
            try:
                self.request.close()
            except Exception:
                pass

    def _socks5(self) -> None:
        conn: socket.socket = self.request

        # --- Greeting ---
        header = self._recv(conn, 2)
        if header[0] != 5:
            return
        methods = self._recv(conn, header[1])
        # Поддерживаем только NO AUTH (0x00)
        if 0 not in methods:
            conn.sendall(b'\x05\xff')
            return
        conn.sendall(b'\x05\x00')

        # --- Request ---
        req = self._recv(conn, 4)
        ver, cmd, _, atyp = req[0], req[1], req[2], req[3]
        if ver != 5 or cmd != 1:  # только CONNECT
            conn.sendall(b'\x05\x07\x00\x01' + b'\x00' * 6)
            return

        if atyp == 1:       # IPv4
            host = socket.inet_ntoa(self._recv(conn, 4))
        elif atyp == 3:     # Domain
            n = self._recv(conn, 1)[0]
            host = self._recv(conn, n).decode('idna')
        elif atyp == 4:     # IPv6
            host = socket.inet_ntop(socket.AF_INET6, self._recv(conn, 16))
        else:
            conn.sendall(b'\x05\x08\x00\x01' + b'\x00' * 6)
            return

        port = struct.unpack('!H', self._recv(conn, 2))[0]

        # --- Connect to target ---
        try:
            remote = socket.create_connection((host, port), timeout=15)
        except Exception:
            conn.sendall(b'\x05\x05\x00\x01' + b'\x00' * 6)
            return

        # --- Success response ---
        conn.sendall(b'\x05\x00\x00\x01' + b'\x00' * 6)

        # --- Relay ---
        try:
            self._relay(conn, remote)
        finally:
            try:
                remote.close()
            except Exception:
                pass

    @staticmethod
    def _recv(sock: socket.socket, n: int) -> bytes:
        buf = b''
        while len(buf) < n:
            chunk = sock.recv(n - len(buf))
            if not chunk:
                raise ConnectionError('connection closed')
            buf += chunk
        return buf

    @staticmethod
    def _relay(a: socket.socket, b: socket.socket) -> None:
        a.setblocking(False)
        b.setblocking(False)
        sockets = [a, b]
        while True:
            try:
                readable, _, exceptional = select.select(sockets, [], sockets, 60)
            except Exception:
                break
            if exceptional:
                break
            if not readable:
                break
            for src in readable:
                dst = b if src is a else a
                try:
                    data = src.recv(65536)
                except Exception:
                    return
                if not data:
                    return
                try:
                    dst.sendall(data)
                except Exception:
                    return


class ThreadedTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True


def main() -> None:
    parser = argparse.ArgumentParser(description='SOCKS5 proxy')
    parser.add_argument('--host', default='0.0.0.0')
    parser.add_argument('--port', type=int, default=1080)
    args = parser.parse_args()

    with ThreadedTCPServer((args.host, args.port), Socks5Handler) as server:
        print(f'SOCKS5 proxy listening on {args.host}:{args.port}', flush=True)
        server.serve_forever()


if __name__ == '__main__':
    main()
