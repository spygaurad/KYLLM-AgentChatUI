import React from 'react';
import { AttentionPattern } from 'circuitsvis';
// import { ColoredTokens } from "circuitsvis";

// import { tokens as ColoredTokens } from 'circuitsvis';
interface CircuitsVisVisualizerProps {
  additionalKwargs: {
    token: string[];
    attention: number[];
  };
}

const CircuitsVisVisualizer: React.FC<CircuitsVisVisualizerProps> = ({ additionalKwargs }) => {
  const { token, attention } = additionalKwargs;

  if (!Array.isArray(token) || !Array.isArray(attention) || token.length !== attention.length) {
    return (
      <div className="text-red-500">
        Error: Invalid token or attention data in additional_kwargs
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Token Attention Visualization</h3>
      <div className="mb-4">
        <AttentionPattern tokens={token} attention={attention} />
      </div>
    </div>
  );
};

export default CircuitsVisVisualizer;