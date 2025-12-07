// ======================================================================
// BASIC LOGIC BLOCK FOR UI LOGIC DIAGRAM
// Simple combinational circuit: TAGMATCH -> VALID -> AND -> MUX -> OUTPUT
// ======================================================================
module cache_logic_basic(
    input  wire        valid,
    input  wire [31:0] address_tag,
    input  wire [31:0] stored_tag,
    
    output wire        tag_match,
    output wire        and_output,
    output wire        hit_output
);

    // TAG MATCH BLOCK
    assign tag_match = (address_tag == stored_tag);

    // AND GATE
    assign and_output = valid & tag_match;

    // MUX (Hit/Miss)
    assign hit_output = and_output ? 1'b1 : 1'b0;

endmodule


// ======================================================================
// COMPLETE CACHE HIT DETECTOR (used inside L1 and L2 controllers)
// ======================================================================
module cache_hit_detector (
    input wire clk,
    input wire rst_n,
    
    input wire [31:0] address,
    input wire [15:0] num_sets,
    input wire [7:0]  offset_bits,
    input wire [7:0]  index_bits,

    input wire [31:0] stored_tag,
    input wire        valid_bit,

    output reg  [15:0] set_index,
    output reg  [31:0] tag,
    output reg  [31:0] block_offset,
    output wire        tag_match,
    output wire        hit_signal
);

    // Address decode (Combinational)
    always @(*) begin
        // Calculate masks based on bit widths
        block_offset = address & ((1 << offset_bits) - 1);
        set_index    = (address >> offset_bits) & ((1 << index_bits) - 1);
        tag          = address >> (offset_bits + index_bits);
    end

    // Compare Tag
    assign tag_match = (tag == stored_tag);

    // HIT Calculation: Must be Valid AND Tag Match
    assign hit_signal = valid_bit & tag_match;

endmodule


// ======================================================================
// L1 CACHE CONTROLLER
// ======================================================================
module l1_cache_controller(
    input  wire        clk,
    input  wire        rst_n,
    input  wire [31:0] address,
    input  wire        read_write, // 0 = Read, 1 = Write
    input  wire [7:0]  data_in,

    input  wire        valid,
    input  wire [31:0] stored_tag,
    input  wire [31:0] stored_data,

    output reg         l1_hit,
    output reg         l1_miss,
    output reg  [7:0]  data_out,

    output wire [31:0] decoded_tag,
    output wire [15:0] decoded_index,
    output wire [31:0] decoded_offset
);

    wire l1_hit_internal;

    // Instantiate Detector for L1 (Example: 256 sets, 64-byte blocks)
    cache_hit_detector hit_det(
        .clk(clk), .rst_n(rst_n),
        .address(address),
        .num_sets(16'd256),
        .offset_bits(8'd6),   // 6 bits for 64-byte block
        .index_bits(8'd8),    // 8 bits for 256 sets
        .stored_tag(stored_tag),
        .valid_bit(valid),
        .set_index(decoded_index),
        .tag(decoded_tag),
        .block_offset(decoded_offset),
        .tag_match(),
        .hit_signal(l1_hit_internal)
    );

    // Registered Output Logic
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            l1_hit  <= 0;
            l1_miss <= 0;
            data_out <= 8'h00;
        end else begin
            l1_hit  <= l1_hit_internal;
            l1_miss <= ~l1_hit_internal;

            // Only output data on HIT and READ operation
            if (l1_hit_internal && !read_write)
                data_out <= stored_data;
            else
                data_out <= 8'h00; // Default/Safe value
        end
    end
endmodule


// ======================================================================
// L2 CACHE CONTROLLER
// ======================================================================
module l2_cache_controller(
    input  wire        clk,
    input  wire        rst_n,
    input  wire [31:0] address,
    input  wire        read_write,
    input  wire [7:0]  data_in,

    input  wire        valid,
    input  wire [31:0] stored_tag,
    input  wire [31:0] stored_data,

    output reg         l2_hit,
    output reg         l2_miss,
    output reg  [7:0]  data_out
);

    wire l2_hit_internal;

    // Instantiate Detector for L2 (Example: 4096 sets, 64-byte blocks)
    cache_hit_detector hit_det(
        .clk(clk), .rst_n(rst_n),
        .address(address),
        .num_sets(16'd4096),
        .offset_bits(8'd6),
        .index_bits(8'd12),   // 12 bits for 4096 sets
        .stored_tag(stored_tag),
        .valid_bit(valid),
        .set_index(),
        .tag(),
        .block_offset(),
        .tag_match(),
        .hit_signal(l2_hit_internal)
    );

    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            l2_hit  <= 0;
            l2_miss <= 0;
            data_out <= 8'h00;
        end else begin
            l2_hit  <= l2_hit_internal;
            l2_miss <= ~l2_hit_internal;

            if (l2_hit_internal && !read_write)
                data_out <= stored_data;
            else
                data_out <= 8'h00;
        end
    end
endmodule


// ======================================================================
// CACHE HIERARCHY
// ======================================================================
module cache_hierarchy(
    input  wire        clk,
    input  wire        rst_n,
    input  wire [31:0] address,
    input  wire        read_write,
    input  wire [7:0]  data_in,

    // Inputs simulating data retrieved from internal L1 memory array
    input  wire        l1_valid,
    input  wire [31:0] l1_stored_tag,
    input  wire [7:0]  l1_data,

    // Inputs simulating data retrieved from internal L2 memory array
    input  wire        l2_valid,
    input  wire [31:0] l2_stored_tag,
    input  wire [7:0]  l2_data,

    output wire        l1_hit,
    output wire        l1_miss,
    output wire        l2_hit,
    output wire        l2_miss,
    output wire [7:0]  data_out,
    output wire        memory_access
);

    // Internal data wires driven by controllers
    wire [7:0] l1_dout_internal;
    wire [7:0] l2_dout_internal;

    // L1 Controller Instance
    l1_cache_controller l1_ctrl(
        .clk(clk), .rst_n(rst_n),
        .address(address),
        .read_write(read_write),
        .data_in(data_in),
        .valid(l1_valid),
        .stored_tag(l1_stored_tag),
        .stored_data(l1_data),
        .l1_hit(l1_hit),
        .l1_miss(l1_miss),
        .data_out(l1_dout_internal), // Capture internal data output
        .decoded_tag(),
        .decoded_index(),
        .decoded_offset()
    );

    // L2 Controller Instance
    l2_cache_controller l2_ctrl(
        .clk(clk), .rst_n(rst_n),
        .address(address),
        .read_write(read_write),
        .data_in(data_in),
        .valid(l2_valid),
        .stored_tag(l2_stored_tag),
        .stored_data(l2_data),
        .l2_hit(l2_hit),
        .l2_miss(l2_miss),
        .data_out(l2_dout_internal)  // Capture internal data output
    );

    // ------------------------------------------------------------------
    // HIERARCHY LOGIC
    // ------------------------------------------------------------------
    
    // Main Memory is accessed only if BOTH L1 and L2 miss
    assign memory_access = l1_miss & l2_miss;

    // Muxing Data Output:
    // If L1 Hit -> Output L1 Data
    // Else If L2 Hit -> Output L2 Data
    // Else -> 0 (or High-Z)
    assign data_out = l1_hit ? l1_dout_internal : 
                      l2_hit ? l2_dout_internal : 8'h00;

endmodule