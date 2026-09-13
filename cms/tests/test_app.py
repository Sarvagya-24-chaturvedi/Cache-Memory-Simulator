import unittest
import sys
import os
import json

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from web_backend import app, CacheSimulator, generate_memory_trace


class TestCacheMemorySimulator(unittest.TestCase):

    def setUp(self):
        app.config["TESTING"] = True
        self.client = app.test_client()

    def test_home_page(self):
        """Verify the main UI index loads cleanly."""
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        self.assertIn(b"Cache Memory Simulator", res.data)

    def test_guest_login(self):
        """Test guest login endpoint."""
        res = self.client.post("/api/guest-login")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["ok"])
        self.assertIn("token", data)
        self.assertEqual(data["role"], "guest")

    def test_address_decoding(self):
        """Verify 32-bit address decomposition math."""
        # 1024B Cache, 16B Block, 4-Way Assoc -> 64 blocks, 16 sets
        # Offset bits = log2(16) = 4
        # Index bits = log2(16) = 4
        # Tag bits = 32 - 4 - 4 = 24
        sim = CacheSimulator(1024, 16, 4, "LRU")
        self.assertEqual(sim.offset_bits, 4)
        self.assertEqual(sim.index_bits, 4)
        self.assertEqual(sim.tag_bits, 24)

        # Address: 0x10A4 (binary: ... 0001 0000 1010 0100)
        # Offset: 0x4 (lower 4 bits: 0100)
        # Set index: 0xA = 10 (next 4 bits: 1010)
        # Tag: 0x10 (upper bits)
        tag, s_idx, offset = sim.addr_decode(0x10A4)
        self.assertEqual(offset, 0x4)
        self.assertEqual(s_idx, 0xA)
        self.assertEqual(tag, 0x10)

    def test_cache_hit_and_miss_behavior(self):
        """Test LRU simulation hit/miss recording."""
        sim = CacheSimulator(1024, 4, 2, "LRU")
        
        # 1st Access: Miss (Cold)
        r1 = sim.access("READ", 4, 0x1000)
        self.assertEqual(r1["result"], "MISS")
        self.assertEqual(sim.misses, 1)

        # 2nd Access to same address: Hit
        r2 = sim.access("READ", 4, 0x1000)
        self.assertEqual(r2["result"], "HIT")
        self.assertEqual(sim.hits, 1)

        # Summary
        stats = sim.stats_summary()
        self.assertEqual(stats["accesses"], 2)
        self.assertEqual(stats["hit_rate_pct"], 50.0)

    def test_sequence_generator(self):
        """Test automatic synthetic trace generator patterns."""
        # Spatial sequential
        seq_text, desc = generate_memory_trace("sequential", {"count": 10, "start_addr": 0x1000, "stride": 4})
        lines = seq_text.splitlines()
        self.assertEqual(len(lines), 10)
        self.assertIn("0x1000", lines[0])
        self.assertIn("0x1004", lines[1])

        # Matrix row vs col major
        row_seq, _ = generate_memory_trace("matrix_row_major", {"matrix_rows": 4, "matrix_cols": 4})
        self.assertEqual(len(row_seq.splitlines()), 16)

        col_seq, _ = generate_memory_trace("matrix_col_major", {"matrix_rows": 4, "matrix_cols": 4})
        self.assertEqual(len(col_seq.splitlines()), 16)

    def test_api_run_simulation(self):
        """Test the /api/run_simulation endpoint with guest authentication."""
        # Get guest token
        login_res = self.client.post("/api/guest-login")
        token = login_res.get_json()["token"]

        headers = {"Authorization": f"Bearer {token}"}
        payload = {
            "cache_size": 1024,
            "block_size": 4,
            "assoc": 4,
            "policy": "LRU",
            "sequence_text": "Read 4 0x1000\nRead 4 0x1000\nWrite 4 0x1004\nRead 4 0x1004",
        }

        res = self.client.post("/api/run_simulation", json=payload, headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["ok"])
        self.assertEqual(data["stats"]["accesses"], 4)
        self.assertEqual(data["stats"]["hits"], 2)
        self.assertEqual(data["stats"]["misses"], 2)
        self.assertEqual(len(data["step_trace"]), 4)

    def test_verilog_hardware_runner(self):
        """Test the /api/run_verilog hardware simulation endpoint."""
        login_res = self.client.post("/api/guest-login")
        token = login_res.get_json()["token"]
        headers = {"Authorization": f"Bearer {token}"}

        res = self.client.post("/api/run_verilog", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["ok"])
        self.assertIn("output", data)


if __name__ == "__main__":
    unittest.main()