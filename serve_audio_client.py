#!/usr/bin/env python3
"""
Simple HTTP server to serve the audio client files.
AudioWorklet requires files to be served over HTTP/HTTPS.
"""

import http.server
import socketserver
import os
import sys

def main():
    # Change to the script directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    PORT = 8080
    
    class CustomHandler(http.server.SimpleHTTPRequestHandler):
        def end_headers(self):
            # Add CORS headers for local development
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', '*')
            super().end_headers()
    
    with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
        print(f"Serving audio client at http://localhost:{PORT}")
        print(f"Open http://localhost:{PORT}/seamless_audio_client.html in your browser")
        print("Press Ctrl+C to stop the server")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped")

if __name__ == "__main__":
    main()