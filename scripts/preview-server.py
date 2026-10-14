import argparse
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
p=argparse.ArgumentParser();p.add_argument("--host",default="0.0.0.0");p.add_argument("--port",type=int,default=4173);p.add_argument("--strictPort",action="store_true");a=p.parse_args()
ThreadingHTTPServer((a.host,a.port),SimpleHTTPRequestHandler).serve_forever()
