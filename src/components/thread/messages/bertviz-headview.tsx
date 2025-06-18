'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';

// --- Constants (inspired by original JS) ---
const TEXT_SIZE = 14; // Slightly smaller for typical web text
const TOKEN_COL_WIDTH = 110; // Width for text columns
const TOKEN_HEIGHT = 22.5;   // Vertical space per token
const LINE_AREA_WIDTH = 115; // Width of the area with attention lines
const HEAD_CHECKBOX_SIZE = 20; // Size of the head color boxes
const TOP_CONTROLS_HEIGHT = 40; // Space for layer/attention dropdowns
const TOP_HEADS_HEIGHT = 30; // Space for head checkboxes
const PADDING = { top: 10, bottom: 10, left: 10, right: 10, textGap: 5 }; // Padding

// Color scheme similar to d3.schemeCategory10
const HEAD_COLORS = [
    "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
    "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf",
    // Add more colors if more than 10 heads are expected
    "#aec7e8", "#ffbb78", "#98df8a", "#ff9896", "#c5b0d5",
    "#c49c94", "#f7b6d2", "#c7c7c7", "#dbdb8d", "#9edae5"
];

// --- Helper Functions ---

// Basic token prettification
const prettifyToken = (token: string): string => {
    return token
        .replace(/Ġ/g, '') // Common BPE prefix
        .replace(/ /g, ' ') // BPE space representation (though usually _ )
        .replace(/_/g, ' ') // Common SentencePiece space representation
        .replace(/</g, '<') // Escape HTML tags
        .replace(/>/g, '>');
};

// Lighten color for inactive heads (similar to original JS)
const lightenColor = (color: string): string => {
    // Basic approximation for web colors - might need a color library for perfect match
    try {
        if (color.startsWith('#')) {
            let r = parseInt(color.slice(1, 3), 16);
            let g = parseInt(color.slice(3, 5), 16);
            let b = parseInt(color.slice(5, 7), 16);

            const factor = 0.6; // How much to lighten (0 = no change, 1 = white)
            r = Math.round(r + (255 - r) * factor);
            g = Math.round(g + (255 - g) * factor);
            b = Math.round(b + (255 - b) * factor);

            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        }
    } catch (e) {
        /* ignore */
    }
    return color; // Fallback
};


// --- Component Interfaces ---

export interface AttentionDataObject {
    name: string | null;
    attn: number[][][][]; // [layer][head][query_idx][key_idx]
    left_text: string[];
    right_text: string[];
}

export interface HeadViewProps {
    attentionData: AttentionDataObject[];
    initialLayer?: number;
    initialHead?: number | 'all'; // Control initial head selection
    prettifyTokens?: boolean;
    // Width is calculated dynamically now
    // svgWidth?: number;
}


// --- The Component ---

export default function HeadView({
    attentionData,
    initialLayer = 0,
    initialHead = 'all', // Default to showing all heads
    prettifyTokens = true,
}: HeadViewProps) {

    if (!attentionData || attentionData.length === 0) {
        return <div>No attention data provided.</div>;
    }

    // --- State ---
    const [selectedAttentionIndex, setSelectedAttentionIndex] = useState(0);

    const currentAttentionData = useMemo(() => {
        return attentionData[selectedAttentionIndex];
    }, [attentionData, selectedAttentionIndex]);

    const numLayers = useMemo(() => currentAttentionData?.attn?.length ?? 0, [currentAttentionData]);
    const numHeads = useMemo(() => currentAttentionData?.attn?.[0]?.length ?? 0, [currentAttentionData]);

    // Ensure initialLayer is valid
    const validInitialLayer = initialLayer >= 0 && initialLayer < numLayers ? initialLayer : 0;
    const [selectedLayerIndex, setSelectedLayerIndex] = useState(validInitialLayer);

    // State for active heads
    const [activeHeads, setActiveHeads] = useState<boolean[]>(() => {
        const initialVisibility = Array(numHeads).fill(true);
        if (typeof initialHead === 'number' && initialHead >= 0 && initialHead < numHeads) {
            initialVisibility.fill(false);
            initialVisibility[initialHead] = true;
        }
        return initialVisibility;
    });

    const [hoveredLeftTokenIndex, setHoveredLeftTokenIndex] = useState<number | null>(null);
    // const [hoveredRightTokenIndex, setHoveredRightTokenIndex] = useState<number | null>(null); // Keep track for potential future use

    // const [setHoveredRightTokenIndex] = useState<number | null>(null); // Keep track for potential future use

    // --- Effect to reset heads when attention data changes ---
    useEffect(() => {
        const newNumHeads = currentAttentionData?.attn?.[0]?.length ?? 0;
        setActiveHeads(Array(newNumHeads).fill(true)); // Reset to all visible
        setSelectedLayerIndex(0); // Reset layer too
    }, [currentAttentionData]);

     // --- Effect to update layer if selected index becomes invalid ---
     useEffect(() => {
        const currentNumLayers = currentAttentionData?.attn?.length ?? 0;
        if (selectedLayerIndex >= currentNumLayers && currentNumLayers > 0) {
            setSelectedLayerIndex(0);
        }
     }, [selectedLayerIndex, currentAttentionData]);


    // --- Memoized Derived Data ---

    const layerOptions = useMemo(() => {
        return Array.from({ length: numLayers }, (_, i) => i);
    }, [numLayers]);

    const currentLayerAttention = useMemo(() => {
        return currentAttentionData?.attn?.[selectedLayerIndex]; // [head][query][key]
    }, [currentAttentionData, selectedLayerIndex]);

    const leftTokens = useMemo(() => {
        const tokens = currentAttentionData?.left_text ?? [];
        return prettifyTokens ? tokens.map(prettifyToken) : tokens;
    }, [currentAttentionData, prettifyTokens]);

    const rightTokens = useMemo(() => {
        const tokens = currentAttentionData?.right_text ?? [];
        return prettifyTokens ? tokens.map(prettifyToken) : tokens;
    }, [currentAttentionData, prettifyTokens]);

    const numActiveHeads = useMemo(() => activeHeads.filter(Boolean).length, [activeHeads]);

    // --- SVG Calculations ---
    const svgHeight = Math.max(leftTokens.length, rightTokens.length) * TOKEN_HEIGHT + TOP_CONTROLS_HEIGHT + TOP_HEADS_HEIGHT + PADDING.top + PADDING.bottom;
    const svgWidth = PADDING.left + TOKEN_COL_WIDTH + PADDING.textGap + LINE_AREA_WIDTH + PADDING.textGap + TOKEN_COL_WIDTH + PADDING.right;

    const leftTextX = PADDING.left;
    const rightTextX = PADDING.left + TOKEN_COL_WIDTH + PADDING.textGap + LINE_AREA_WIDTH + PADDING.textGap;
    const lineStartX = PADDING.left + TOKEN_COL_WIDTH + PADDING.textGap;
    const lineEndX = lineStartX + LINE_AREA_WIDTH;
    const textYOffset = TOP_CONTROLS_HEIGHT + TOP_HEADS_HEIGHT + PADDING.top;

    // --- Event Handlers ---
    const handleLayerChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedLayerIndex(parseInt(event.target.value, 10));
        setHoveredLeftTokenIndex(null);
        // setHoveredRightTokenIndex(null);
    };

    const handleAttentionTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newIndex = parseInt(event.target.value, 10);
        setSelectedAttentionIndex(newIndex);
        // Layer/Head reset is handled by useEffect
        setHoveredLeftTokenIndex(null);
        // setHoveredRightTokenIndex(null);
    };

    const handleLeftTokenMouseEnter = useCallback((index: number) => {
        setHoveredLeftTokenIndex(index);
    }, []);

    const handleLeftTokenMouseLeave = useCallback(() => {
        setHoveredLeftTokenIndex(null);
    }, []);

    // Placeholder for potential right token hover
    const handleRightTokenMouseEnter = useCallback((index: number) => {
        // setHoveredRightTokenIndex(index); // Currently unused
        setHoveredLeftTokenIndex(index);

    }, []);

    const handleRightTokenMouseLeave = useCallback(() => {
        // setHoveredRightTokenIndex(null); // Currently unused
        setHoveredLeftTokenIndex(null);

    }, []);

    const handleHeadClick = useCallback((index: number) => {
        setActiveHeads(prev => {
            const newActiveHeads = [...prev];
            // Prevent disabling the last active head
            if (newActiveHeads[index] && numActiveHeads === 1) {
                return prev;
            }
            newActiveHeads[index] = !newActiveHeads[index];
            return newActiveHeads;
        });
    }, [numActiveHeads]);

    const handleHeadDoubleClick = useCallback((index: number) => {
         setActiveHeads(prev => {
            // If double-clicking the only active head, activate all
            if (prev[index] && numActiveHeads === 1) {
                return Array(numHeads).fill(true);
            }
            // Otherwise, activate only the double-clicked head
            const newActiveHeads = Array(numHeads).fill(false);
            newActiveHeads[index] = true;
            return newActiveHeads;
         });
    }, [numHeads, numActiveHeads]);

    // Calculate offsets for attention boxes on right side during hover
    const calculateRightAttentionBoxProps = useCallback((rightTokenIndex: number) => {
        const boxes: { x: number; width: number; fill: string; opacity: number }[] = [];
        if (hoveredLeftTokenIndex === null || !currentLayerAttention || numActiveHeads === 0) {
            return boxes;
        }

        let currentX = rightTextX; // Start from the left edge of the right text column
        const boxWidth = TOKEN_COL_WIDTH / numActiveHeads;

        activeHeads.forEach((isActive, headIndex) => {
            if (isActive) {
                const score = currentLayerAttention?.[headIndex]?.[hoveredLeftTokenIndex]?.[rightTokenIndex] ?? 0;
                boxes.push({
                    x: currentX,
                    width: boxWidth,
                    fill: HEAD_COLORS[headIndex % HEAD_COLORS.length],
                    opacity: score, // Use raw score for opacity, maybe scale later if needed
                });
                currentX += boxWidth;
            }
        });
        return boxes;
    }, [hoveredLeftTokenIndex, currentLayerAttention, activeHeads, numActiveHeads, rightTextX]);


    // --- Rendering ---
    return (
        <div style={{ fontFamily: "'DejaVu Sans Mono', monospace", userSelect: 'none' }}>
             {/* Controls: Layer and Attention Type Selectors */}
            <div style={{ marginBottom: '5px', display: 'flex', gap: '20px', alignItems: 'center', height: TOP_CONTROLS_HEIGHT, paddingLeft: PADDING.left }}>
                <div>
                    <label htmlFor="layerSelect" style={{ marginRight: '5px', fontSize: '14px' }}>Layer: </label>
                    <select
                        id="layerSelect"
                        value={selectedLayerIndex}
                        onChange={handleLayerChange}
                        disabled={layerOptions.length === 0}
                        style={{ fontSize: '14px', padding: '2px' }}
                    >
                        {layerOptions.map(layer => (
                            <option key={layer} value={layer}>{layer}</option>
                        ))}
                    </select>
                </div>
                {attentionData.length > 1 && (
                    <div>
                        <label htmlFor="attentionTypeSelect" style={{ marginRight: '5px', fontSize: '14px' }}>Attention: </label>
                        <select
                            id="attentionTypeSelect"
                            value={selectedAttentionIndex}
                            onChange={handleAttentionTypeChange}
                            style={{ fontSize: '14px', padding: '2px' }}
                        >
                            {attentionData.map((data, index) => (
                                <option key={index} value={index}>
                                    {data.name || `Type ${index + 1}`}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Visualization SVG */}
            <svg width={svgWidth} height={svgHeight} style={{ cursor: 'default', border: '1px solid #eee' }}>

                {/* Head Selection Checkboxes */}
                <g transform={`translate(${PADDING.left}, ${TOP_CONTROLS_HEIGHT + PADDING.top / 2})`} style={{cursor: 'pointer'}}>
                    {activeHeads.map((isActive, index) => (
                        <rect
                            key={`head-check-${index}`}
                            x={index * HEAD_CHECKBOX_SIZE}
                            y={0}
                            width={HEAD_CHECKBOX_SIZE}
                            height={HEAD_CHECKBOX_SIZE}
                            fill={isActive ? HEAD_COLORS[index % HEAD_COLORS.length] : lightenColor(HEAD_COLORS[index % HEAD_COLORS.length])}
                            stroke="#ccc"
                            strokeWidth={0.5}
                            onClick={() => handleHeadClick(index)}
                            onDoubleClick={() => handleHeadDoubleClick(index)}
                        >
                            <title>{`Head ${index}`}</title>
                        </rect>
                    ))}
                </g>

                {/* Left Tokens */}
                <g transform={`translate(0, ${textYOffset})`}>
                    {leftTokens.map((token, index) => (
                        <g
                            key={`left-token-group-${index}`}
                            onMouseEnter={() => handleLeftTokenMouseEnter(index)}
                            onMouseLeave={handleLeftTokenMouseLeave}
                            style={{ cursor: 'pointer' }}
                        >
                            {/* Background Hover Rect */}
                            <rect
                                x={leftTextX}
                                y={index * TOKEN_HEIGHT}
                                width={TOKEN_COL_WIDTH}
                                height={TOKEN_HEIGHT}
                                fill={hoveredLeftTokenIndex === index ? "lightgray" : "transparent"}
                                style={{transition: 'fill 0.1s ease-in-out'}}
                            />
                             {/* Token Text */}
                            <text
                                x={leftTextX + TOKEN_COL_WIDTH - PADDING.textGap} // Align right within its column
                                y={index * TOKEN_HEIGHT + TOKEN_HEIGHT / 2}
                                textAnchor="end"
                                dominantBaseline="middle"
                                fontSize={TEXT_SIZE}
                                fill="#333"
                                style={{ pointerEvents: 'none' }} // Prevent text from stealing hover
                            >
                                {token}
                            </text>
                        </g>
                    ))}
                </g>

                 {/* Right Tokens */}
                <g transform={`translate(0, ${textYOffset})`}>
                    {rightTokens.map((token, index) => (
                        <g
                            key={`right-token-group-${index}`}
                            onMouseEnter={() => handleRightTokenMouseEnter(index)}
                            onMouseLeave={handleRightTokenMouseLeave}
                            // style={{ cursor: 'pointer' }} // Add if right hover interaction needed
                        >
                            {/* Attention Boxes (shown on left token hover) */}
                            {calculateRightAttentionBoxProps(index).map((boxProps, boxIdx) => (
                                <rect
                                    key={`right-attn-box-${index}-${boxIdx}`}
                                    x={boxProps.x}
                                    y={index * TOKEN_HEIGHT}
                                    width={boxProps.width}
                                    height={TOKEN_HEIGHT}
                                    fill={boxProps.fill}
                                    opacity={boxProps.opacity}
                                    style={{transition: 'opacity 0.1s ease-in-out'}}
                                />
                            ))}
                            {/* Background Hover Rect (optional for right side) */}
                            {/* <rect
                                x={rightTextX}
                                y={index * TOKEN_HEIGHT}
                                width={TOKEN_COL_WIDTH}
                                height={TOKEN_HEIGHT}
                                fill={hoveredRightTokenIndex === index ? "lightgray" : "transparent"}
                                style={{transition: 'fill 0.1s ease-in-out'}}
                            /> */}
                             {/* Token Text */}
                            <text
                                x={rightTextX + PADDING.textGap} // Align left within its column
                                y={index * TOKEN_HEIGHT + TOKEN_HEIGHT / 2}
                                textAnchor="start"
                                dominantBaseline="middle"
                                fontSize={TEXT_SIZE}
                                fill="#333"
                                style={{ pointerEvents: 'none' }}
                            >
                                {token}
                            </text>
                        </g>
                    ))}
                </g>

                {/* Attention Lines */}
                <g transform={`translate(0, ${textYOffset})`}>
                    {currentLayerAttention && leftTokens.map((_, leftIdx) => {
                        // Determine if lines from this left token should be drawn
                        const isHovered = hoveredLeftTokenIndex === leftIdx;
                        // Show all lines if nothing hovered, or only lines from hovered token
                        const showLines = hoveredLeftTokenIndex === null || isHovered;
                        if (!showLines) return null;

                        return rightTokens.map((_, rightIdx) => {
                           return activeHeads.map((isActive, headIdx) => {
                                if (!isActive) return null; // Skip inactive heads

                                const attentionScore = currentLayerAttention?.[headIdx]?.[leftIdx]?.[rightIdx] ?? 0;
                                // Original JS divides score by numActiveHeads for opacity, let's mimic that
                                const opacity = numActiveHeads > 0 ? (attentionScore / numActiveHeads) : 0;

                                // Don't render negligible lines (adjust threshold as needed)
                                if (opacity < 0.01) return null;

                                const y1 = leftIdx * TOKEN_HEIGHT + TOKEN_HEIGHT / 2;
                                const y2 = rightIdx * TOKEN_HEIGHT + TOKEN_HEIGHT / 2;
                                const color = HEAD_COLORS[headIdx % HEAD_COLORS.length];

                                return (
                                    <line
                                        key={`line-${headIdx}-${leftIdx}-${rightIdx}`}
                                        x1={lineStartX}
                                        y1={y1}
                                        x2={lineEndX}
                                        y2={y2}
                                        stroke={color}
                                        strokeWidth={1.5} // Slightly thicker lines
                                        strokeOpacity={opacity}
                                        // Visibility handled by parent group logic (showLines)
                                    />
                                );
                           });
                        });
                    })}
                </g>
            </svg>
        </div>
    );
}