'use client'; // Or dynamically import HeadView if needed in a server component
import HeadView from '../components/thread/messages/bertviz-headview';
import { useState } from 'react'; // Example state for data
import {AttentionDataObject} from '../../src/components/thread/messages/bertviz-headview';
// import HeadViewProps from '../../src/components/thread/messages/bertviz-headview';

// --- EXAMPLE DATA ---
// Replace with your actual data loading/generation
const exampleAttentionData = [
    {
        name: 'Self-Attention',
        // attn: [layer][head][query][key] - Dimensions: 2 layers, 2 heads, 4 tokens, 4 tokens
        attn: [
            // Layer 0
            [
                // Head 0
                [[0.7, 0.1, 0.1, 0.1], [0.1, 0.7, 0.1, 0.1], [0.1, 0.1, 0.7, 0.1], [0.1, 0.1, 0.1, 0.7]],
                // Head 1
                [[0.8, 0.1, 0.05, 0.05], [0.2, 0.6, 0.1, 0.1], [0.1, 0.3, 0.5, 0.1], [0.1, 0.1, 0.2, 0.6]],
                [[0.5, 0.3, 0.1, 0.1], [0.1, 0.5, 0.2, 0.2], [0.2, 0.1, 0.5, 0.2], [0.3, 0.1, 0.1, 0.5]],
                [[0.1, 0.1, 0.1, 0.7], [0.1, 0.1, 0.7, 0.1], [0.1, 0.7, 0.1, 0.1], [0.7, 0.1, 0.1, 0.1]],
            ],
            [
                // Head 0
                [[0.7, 0.1, 0.1, 0.1], [0.1, 0.7, 0.1, 0.1], [0.1, 0.1, 0.7, 0.1], [0.1, 0.1, 0.1, 0.7]],
                // Head 1
                [[0.8, 0.1, 0.05, 0.05], [0.2, 0.6, 0.1, 0.1], [0.1, 0.3, 0.5, 0.1], [0.1, 0.1, 0.2, 0.6]],
                [[0.5, 0.3, 0.1, 0.1], [0.1, 0.5, 0.2, 0.2], [0.2, 0.1, 0.5, 0.2], [0.3, 0.1, 0.1, 0.5]],
                [[0.1, 0.1, 0.1, 0.7], [0.1, 0.1, 0.7, 0.1], [0.1, 0.7, 0.1, 0.1], [0.7, 0.1, 0.1, 0.1]],
            ],
            [
                // Head 0
                [[0.7, 0.1, 0.1, 0.1], [0.1, 0.7, 0.1, 0.1], [0.1, 0.1, 0.7, 0.1], [0.1, 0.1, 0.1, 0.7]],
                // Head 1
                [[0.8, 0.1, 0.05, 0.05], [0.2, 0.6, 0.1, 0.1], [0.1, 0.3, 0.5, 0.1], [0.1, 0.1, 0.2, 0.6]],
                [[0.5, 0.3, 0.1, 0.1], [0.1, 0.5, 0.2, 0.2], [0.2, 0.1, 0.5, 0.2], [0.3, 0.1, 0.1, 0.5]],
                [[0.1, 0.1, 0.1, 0.7], [0.1, 0.1, 0.7, 0.1], [0.1, 0.7, 0.1, 0.1], [0.7, 0.1, 0.1, 0.1]],
            ],
            [
                // Head 0
                [[0.7, 0.1, 0.1, 0.1], [0.1, 0.7, 0.1, 0.1], [0.1, 0.1, 0.7, 0.1], [0.1, 0.1, 0.1, 0.7]],
                // Head 1
                [[0.8, 0.1, 0.05, 0.05], [0.2, 0.6, 0.1, 0.1], [0.1, 0.3, 0.5, 0.1], [0.1, 0.1, 0.2, 0.6]],
                [[0.5, 0.3, 0.1, 0.1], [0.1, 0.5, 0.2, 0.2], [0.2, 0.1, 0.5, 0.2], [0.3, 0.1, 0.1, 0.5]],
                [[0.1, 0.1, 0.1, 0.7], [0.1, 0.1, 0.7, 0.1], [0.1, 0.7, 0.1, 0.1], [0.7, 0.1, 0.1, 0.1]],
            ],
            [
                // Head 0
                [[0.7, 0.1, 0.1, 0.1], [0.1, 0.7, 0.1, 0.1], [0.1, 0.1, 0.7, 0.1], [0.1, 0.1, 0.1, 0.7]],
                // Head 1
                [[0.8, 0.1, 0.05, 0.05], [0.2, 0.6, 0.1, 0.1], [0.1, 0.3, 0.5, 0.1], [0.1, 0.1, 0.2, 0.6]],
                [[0.5, 0.3, 0.1, 0.1], [0.1, 0.5, 0.2, 0.2], [0.2, 0.1, 0.5, 0.2], [0.3, 0.1, 0.1, 0.5]],
                [[0.1, 0.1, 0.1, 0.7], [0.1, 0.1, 0.7, 0.1], [0.1, 0.7, 0.1, 0.1], [0.7, 0.1, 0.1, 0.1]],
            ],
            
        ],
        left_text: ['[CLS]', 'This', 'is', 'great'],
        right_text: ['[CLS]', 'This', 'is', 'great'],
    }
    // Add more objects here for Encoder/Decoder/Cross if needed
];
// --- END EXAMPLE DATA ---


export function VisualizationPage() {
    // You might fetch this data or have it statically
    // const [attentionData, setAttentionData] = useState(exampleAttentionData);
    const [attentionData] = useState(exampleAttentionData);


    return (
        <div>
            <h1>Attention Head View</h1>
            <HeadView
                attentionData={attentionData}
                initialLayer={0} // Start viewing layer 0
                prettifyTokens={true}
            />
            {/* You can customize other props like svgWidth, etc. */}
        </div>
    );
}



// import { tokens as ColoredTokens } from 'circuitsvis';
interface BertHeadVisualizerProps {
  additionalKwargs: {
    token: string[];
    bert_attention_dict: AttentionDataObject;
  };
}

const BertHeadVisualizer: React.FC<BertHeadVisualizerProps> = ({ additionalKwargs }) => {
    // const token  = additionalKwargs.token;
    // const bert_attention_dict = additionalKwargs.bert_attention_dict.bert_attention;
    const bert_attention_dict = additionalKwargs.bert_attention_dict;

    let attentionDataFormatted: AttentionDataObject[];

    console.log("Example Attention: ", exampleAttentionData)
    console.log("Bert Attention", [bert_attention_dict])
    // Ensure bert_attention_raw is always an array of AttentionDataObject
    if (Array.isArray(bert_attention_dict)) {
        attentionDataFormatted = bert_attention_dict;
    } else {
        // If it's a single AttentionDataObject, wrap it in an array
        attentionDataFormatted = [bert_attention_dict];
    }
    
    // const attentionDataFormatted = [ {
    // name: 'Self-Attention',
    // // attn: [layer][head][query][key] - Dimensions: 2 layers, 2 heads, 4 tokens, 4 tokens
    // attn:bert_attention,
    // left_text: ['[CLS]', 'This', 'is', 'great'],
    // right_text: ['[CLS]', 'This', 'is', 'great'],
    // }]
    // const [attentionData, setAttentionData] = useState(attentionDataFormatted);


//   if (!Array.isArray(token) || !Array.isArray(bert_attention) || token.length !== bert_attention.length) {
//     return (
//       <div className="text-red-500">
//         Error: Invalid token or attention data in additional_kwargs
//       </div>
//     );
//   }


  return (
    <div>
        <h1>Attention Head View</h1>
        <HeadView
            attentionData={attentionDataFormatted}
            initialLayer={0} // Start viewing layer 0
            prettifyTokens={true}
        />
        {/* You can customize other props like svgWidth, etc. */}
    </div>
);

};

export default BertHeadVisualizer;