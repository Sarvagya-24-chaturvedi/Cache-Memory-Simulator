import os
import sys

# Ensure current directory is on path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from web_backend import app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port)
