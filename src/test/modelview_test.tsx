// // src/app/model-view-test/page.tsx (or wherever you place test pages)
// 'use client'; // Or dynamically import ModelView if needed in a server component
// import ModelView from '@/components/thread/messages/modelview';
// import { useState } from 'react';

// // --- EXAMPLE DATA for ModelView ---
// // Needs to be an array of AttentionDataItem objects

// // interface AttentionDataItem {
// //     name: string | null;
// //     // attn: [layer][head][query_index][key_index]
// //     attn: number[][][][]; // CORRECTED: Was number[][][]
// //     left_text: string[];
// //     right_text: string[];
// // }

// // Helper to generate a simple attention matrix (SourceLen x TargetLen)
// const generateDummyAttnMatrix = (sourceLen: number, targetLen: number): number[][] => {
//     const matrix: number[][] = [];
//     for (let i = 0; i < sourceLen; i++) {
//         const row: number[] = [];
//         let sum = 0;
//         // Generate random-ish numbers
//         for (let j = 0; j < targetLen; j++) {
//             const val = Math.random();
//             row.push(val);
//             sum += val;
//         }
//         // Normalize (roughly) so it looks like probabilities - not strictly necessary for display
//         const normalizedRow = sum > 0 ? row.map(v => v / sum) : row.map(() => 1 / targetLen);
//         matrix.push(normalizedRow);
//     }
//     // Add some bias (e.g., diagonal for self-attention)
//     if (sourceLen === targetLen) {
//         for (let i = 0; i < sourceLen; i++) {
//             if (matrix[i]) { // Check if row exists
//                  matrix[i][i] = (matrix[i][i] || 0) + 0.5; // Boost diagonal
//                  // Re-normalize after boosting
//                  let rowSum = matrix[i].reduce((acc, val) => acc + val, 0);
//                  if (rowSum > 0) {
//                     matrix[i] = matrix[i].map(v => v / rowSum);
//                  }
//             }
//         }
//     }
//     return matrix;
// };

// // Generate attention for multiple layers and heads
// const generateDummyLayerHeadAttn = (
//     numLayers: number,
//     numHeads: number,
//     sourceLen: number, // Corresponds to query_len in self-attention, target_len (query) in cross-attention
//     targetLen: number  // Corresponds to key_len in self-attention, source_len (key/value) in cross-attention
// ): number[][][][] => { // CORRECTED: Return type is 4D array
//     const layersData: number[][][][] = []; // CORRECTED: This will hold all layers (4D)
//     for (let l = 0; l < numLayers; l++) {
//         const headsInLayer: number[][][] = []; // CORRECTED: This holds matrices for heads in one layer (3D)
//         for (let h = 0; h < numHeads; h++) {
//             // generateDummyAttnMatrix returns number[][] (one attention matrix)
//             // The dimensions passed depend on whether it's self or cross attention logic,
//             // but for generation purpose, sourceLen maps to query sequence length, targetLen to key sequence length.
//             headsInLayer.push(generateDummyAttnMatrix(sourceLen, targetLen));
//         }
//         layersData.push(headsInLayer); // Add the layer's head data
//     }
//     return layersData;
// };

// // -- Configuration for Example Data --
// const NUM_LAYERS = 2;
// const NUM_HEADS = 4; // IMPORTANT: This number is used for the `totalHeads` prop
// const SELF_ATTN_TOKENS = ['[CLS]', 'Model', 'view', 'test', '[SEP]']; // 5 tokens
// const CROSS_ATTN_SOURCE_TOKENS = ['[CLS]', 'Source', 'input', '[SEP]']; // 4 tokens
// const CROSS_ATTN_TARGET_TOKENS = ['[CLS]', 'Target', 'output', 'is', 'here', '[SEP]']; // 6 tokens


// const exampleAttentionData = [
//     // Item 1: Self-Attention
//     {
//         name: 'Encoder Self-Attention',
//         // attn: [layer][head][query_token][key_token]
//         // Dimensions: NUM_LAYERS x NUM_HEADS x SELF_ATTN_TOKENS.length x SELF_ATTN_TOKENS.length
//         attn: generateDummyLayerHeadAttn(
//             NUM_LAYERS,
//             NUM_HEADS,
//             SELF_ATTN_TOKENS.length, // Query length
//             SELF_ATTN_TOKENS.length  // Key length
//         ), // <--- Type should now match AttentionDataItem['attn']
//         left_text: SELF_ATTN_TOKENS,
//         right_text: SELF_ATTN_TOKENS,
//     },
//     // Item 2: Cross-Attention
//     {
//         name: 'Decoder Cross-Attention',
//         // attn: [layer][head][query_token][key_token]
//         // Dimensions: NUM_LAYERS x NUM_HEADS x CROSS_ATTN_TARGET_TOKENS.length x CROSS_ATTN_SOURCE_TOKENS.length
//         attn: generateDummyLayerHeadAttn(
//             NUM_LAYERS,
//             NUM_HEADS,
//             CROSS_ATTN_TARGET_TOKENS.length, // Query sequence length (target)
//             CROSS_ATTN_SOURCE_TOKENS.length  // Key/Value sequence length (source)
//         ), // <--- Type should now match AttentionDataItem['attn']
//         left_text: CROSS_ATTN_TARGET_TOKENS,
//         right_text: CROSS_ATTN_SOURCE_TOKENS,
//     }
// ];
// // --- END EXAMPLE DATA ---


// export default function ModelVisualizationPage() {
//     // You might fetch this data or have it statically
//     // const [attentionData, setAttentionData] = useState(exampleAttentionData);
//     const [attentionData] = useState(exampleAttentionData);

//     // Check if data is valid before rendering
//     if (!attentionData || attentionData.length === 0 || !attentionData[0]?.attn) {
//         return <div>Loading attention data or data is invalid...</div>;
//     }

//     return (
//         <div style={{ padding: '20px' }}>
//             <h1>Transformer Model View</h1>
//             <p>Displaying {NUM_LAYERS} layers and {NUM_HEADS} heads.</p>

//             {/* Example 1: Default view */}
//             <h2>Default View (Dark Mode)</h2>
//             <ModelView
//                 attentionData={attentionData}
//                 totalHeads={NUM_HEADS} // Crucial: Must match the number of heads PER LAYER in the *original* model data
//                 // defaultFilter="0" // Optional: start with the first item (default)
//                 // displayMode="dark" // Optional: use dark mode (default)
//             />

//             <hr style={{ margin: '40px 0' }}/>

//             {/* Example 2: Light mode, filtered view */}
//             <h2>Filtered View (Light Mode, Layer 1, Heads 0 & 2)</h2>
//             <ModelView
//                 attentionData={attentionData}
//                 totalHeads={NUM_HEADS} // Still the total heads of the original model for scaling
//                 displayMode="light"
//                 includeLayers={[1]}    // Show only original layer index 1 (0-based)
//                 includeHeads={[0, 2]} // Show only original head indices 0 and 2
//                 defaultFilter="1"     // Start with the second data item (Cross-Attention)
//             />

//              <hr style={{ margin: '40px 0' }}/>

//              {/* Example 3: Only showing first item */}
//              <h2>Only First Attention Type (Self-Attention)</h2>
//              <ModelView
//                  attentionData={[attentionData[0]]} // Pass only the first item in the array
//                  totalHeads={NUM_HEADS}
//              />
//         </div>
//     );
// }