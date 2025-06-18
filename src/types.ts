// types.ts

export interface AttentionLayerData {
    attn: number[][][]; // [num_heads, source_seq_len, target_seq_len]
    queries?: number[][][]; // [num_heads, seq_len, vector_size]
    keys?: number[][][]; // [num_heads, seq_len, vector_size]
  }
  
  // Data structure for a specific filter (e.g., 'all', 'aa', 'ab')
  export interface AttentionDataPerFilter {
    attn: number[][][]; // List of layers, each shape [num_heads, source_seq_len, target_seq_len]
    left_text: string[];
    right_text: string[];
    queries?: number[][][][]; // List of layers, each shape [num_heads, seq_len, vector_size]
    keys?: number[][][][]; // List of layers, each shape [num_heads, seq_len, vector_size]
  }
  
  // The full attention data object
  export interface AttentionData {
    all: AttentionDataPerFilter;
    aa?: AttentionDataPerFilter; // Only present if sentence_b is provided
    bb?: AttentionDataPerFilter; // Only present if sentence_b is provided
    ab?: AttentionDataPerFilter; // Only present if sentence_b is provided
    ba?: AttentionDataPerFilter; // Only present if sentence_b is provided
    // Add other filters if the original code supports them
  }
  
  export interface NeuronViewProps {
    attention: AttentionData;
    defaultFilter?: keyof AttentionData; // Use keys of AttentionData as valid filters
    displayMode?: 'dark' | 'light';
    initialLayer?: number;
    initialHead?: number;
    bidirectional?: boolean; // From Python code, defaults to true for BERT/RoBERTa
  }