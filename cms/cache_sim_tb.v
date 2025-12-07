// Testbench that generates waveforms for cache hierarchy
`timescale 1ns/1ps

module cache_hierarchy_tb;

    // Clock + reset
    reg clk;
    reg rst_n;

    // Inputs
    reg [31:0] address;
    reg read_write;
    reg [7:0] data_in;

    // L1 inputs (Simulated tag/data from cache memory array)
    reg l1_valid;
    reg [31:0] l1_tag;
    reg [7:0] l1_data;

    // L2 inputs (Simulated tag/data from cache memory array)
    reg l2_valid;
    reg [31:0] l2_tag;
    reg [7:0] l2_data;

    // Outputs
    wire l1_hit, l1_miss;
    wire l2_hit, l2_miss;
    wire [7:0] data_out;
    wire memory_access;

    // --------------------------------------------------------------------
    // DUT INSTANTIATION
    // --------------------------------------------------------------------
    cache_hierarchy dut (
        .clk(clk),
        .rst_n(rst_n),
        .address(address),
        .read_write(read_write),
        .data_in(data_in),
        .l1_valid(l1_valid),
        .l1_stored_tag(l1_tag),
        .l1_data(l1_data),
        .l2_valid(l2_valid),
        .l2_stored_tag(l2_tag),
        .l2_data(l2_data),
        .l1_hit(l1_hit),
        .l1_miss(l1_miss),
        .l2_hit(l2_hit),
        .l2_miss(l2_miss),
        .data_out(data_out),
        .memory_access(memory_access)
    );

    // Clock Generation (100 MHz -> 10ns period)
    initial begin
        clk = 0;
        forever #5 clk = ~clk;
    end

    // Test Sequence
    initial begin
        // VCD dump for waveform viewing
        $dumpfile("cache_waveform.vcd");
        $dumpvars(0, cache_hierarchy_tb);

        // Initialize signals
        rst_n = 0;
        address = 0;
        read_write = 0;
        data_in = 0;
        l1_valid = 0;
        l1_tag = 0;
        l1_data = 0;
        l2_valid = 0;
        l2_tag = 0;
        l2_data = 0;

        // Release Reset
        #20 rst_n = 1;

        // --------------------------------------------------------
        // TEST 1: L1 HIT (READ)
        // --------------------------------------------------------
        #10;
        address = 32'h00000010;
        read_write = 0;         // READ
        l1_valid = 1;
        l1_tag = 32'h00000000;  // Matches tag for 0x10
        l1_data = 8'hAA;
        l2_valid = 0;           // L2 irrelevant
        
        $display("--------------------------------------------------");
        $display("T=%0t: TEST 1 -> Initiating Read 0x10 (Expect L1 HIT)", $time);

        // --------------------------------------------------------
        // TEST 2: L1 MISS, L2 HIT
        // --------------------------------------------------------
        #10;
        address = 32'h00000020;
        read_write = 0;
        l1_valid = 0;          // L1 MISS
        l1_tag = 32'h00000001; // Mismatch
        l1_data = 8'h00;

        l2_valid = 1;          // L2 HIT
        l2_tag = 32'h00000000; // Matches tag for 0x20
        l2_data = 8'hBB;

        $display("--------------------------------------------------");
        $display("T=%0t: TEST 2 -> Initiating Read 0x20 (Expect L1 MISS, L2 HIT)", $time);

        // --------------------------------------------------------
        // TEST 3: L1 MISS, L2 MISS -> MEMORY ACCESS
        // --------------------------------------------------------
        #10;
        address = 32'h00000040;
        read_write = 0;

        l1_valid = 0;
        l2_valid = 0;
        l1_tag = 32'h1;
        l2_tag = 32'h1;
        l1_data = 8'h00;
        l2_data = 8'h00;

        $display("--------------------------------------------------");
        $display("T=%0t: TEST 3 -> Initiating Read 0x40 (Expect BOTH MISS)", $time);

        // --------------------------------------------------------
        // TEST 4: WRITE with L1 HIT
        // --------------------------------------------------------
        #10;
        address = 32'h00000050;
        read_write = 1;      // WRITE
        data_in = 8'hCC;
        
        l1_valid = 1;
        l1_tag  = 32'h00000000;
        l1_data = 8'hDD; // Old data
        l2_valid = 0;

        $display("--------------------------------------------------");
        $display("T=%0t: TEST 4 -> Initiating Write 0x50 (Expect L1 HIT)", $time);

        // --------------------------------------------------------
        // TEST 5: L1 VALID but TAG MISMATCH
        // --------------------------------------------------------
        #10;
        address = 32'h00000060;
        read_write = 0;

        l1_valid = 1;
        l1_tag = 32'hFFFF_FFFF; // Wrong tag -> MISS

        l2_valid = 1;
        l2_tag = 32'h00000000;
        l2_data = 8'hFF;

        $display("--------------------------------------------------");
        $display("T=%0t: TEST 5 -> Initiating Read 0x60 (Expect Tag Mismatch)", $time);

        #20;
        $display("--------------------------------------------------");
        $display("Simulation Finished.");
        $finish;
    end

    // Monitor hits/misses on positive clock edge
    always @(posedge clk) begin
        // We check signals slightly after edge to ensure stability in simulation
        #1; 
        if (rst_n) begin
            if (l1_hit)
                $display("  [RESULT] Time=%0t: L1 HIT for Address=0x%h Data=0x%h", $time, address, data_out);

            else if (l1_miss && l2_hit)
                $display("  [RESULT] Time=%0t: L1 MISS, L2 HIT for Address=0x%h Data=0x%h", $time, address, data_out);

            else if (l1_miss && l2_miss)
                $display("  [RESULT] Time=%0t: L1 MISS, L2 MISS -> Accessing Main Memory (Addr=0x%h)", $time, address);
        end
    end

endmodule