import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import type { Selection, BaseType } from 'd3'; // Import specific D3 types

// Define types for the attention data
interface AttentionDataItem {
    name: string | null;
    attn: number[][][][]; // Layers x Heads x SourceLen x TargetLen
    left_text: string[];
    right_text: string[];
}

// Define types for the component props
interface ModelViewProps {
    attentionData: AttentionDataItem[];
    defaultFilter?: string; // Index as string, e.g., "0"
    displayMode?: 'light' | 'dark';
    includeLayers?: number[]; // Zero-based indices of original layers
    includeHeads?: number[]; // Zero-based indices of original heads
    totalHeads: number; // Total heads in the *original* model (before filtering), used for scaling thumbnails
}

// --- Constants ---
const MIN_X = 0;
const MIN_Y = 0;
const DIV_WIDTH = 970; // Target width of the visualization area
const THUMBNAIL_PADDING = 5;
const DETAIL_WIDTH = 300; // Width of content area in detail view
const DETAIL_ATTENTION_WIDTH = 140;
const DETAIL_BOX_WIDTH = 80;
const DETAIL_BOX_HEIGHT = 18;
const DETAIL_PADDING = 15; // Padding inside the detail view frame
const ATTN_PADDING = 0;
const DETAIL_HEADING_HEIGHT = 25;
const HEADING_TEXT_SIZE = 15;
const HEADING_PADDING = 5;
const TEXT_SIZE = 13;
const TEXT_PADDING = 5;
const LAYER_COLORS = d3.schemeCategory10;
const PALETTE = {
    'light': {
        'text': 'black',
        'background': 'white',
        'highlight': '#F5F5F5'
    },
    'dark': {
        'text': '#ccc',
        'background': 'black',
        'highlight': '#222'
    }
};
// --- ---

// Type alias for D3 selections for clarity
type SVGGroupSelection = Selection<SVGGElement, unknown, BaseType, unknown>;
// Explicit type for attention matrix data used in rendering functions
type AttentionMatrix = number[][];


const ModelView: React.FC<ModelViewProps> = ({
    attentionData,
    defaultFilter = "0",
    displayMode = "dark",
    includeLayers: propIncludeLayers,
    includeHeads: propIncludeHeads,
    totalHeads, // Use this for scaling calculation
}) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const [selectedFilter, setSelectedFilter] = useState(defaultFilter);
    // Store indices *relative to the filtered view*
    const [detailLayerIndexInView, setDetailLayerIndexInView] = useState<number | null>(null);
    const [detailHeadIndexInView, setDetailHeadIndexInView] = useState<number | null>(null);

    // --- Data Selection ---
    const currentAttData = useMemo(() => {
        const index = parseInt(selectedFilter, 10);
        // Basic validation
        if (!attentionData || index < 0 || index >= attentionData.length || !attentionData[index]) {
             console.warn(`Invalid filter index ${index} or missing data.`);
             return null;
        }
        // Validate basic structure
        const data = attentionData[index];
        if (!data.attn || !Array.isArray(data.attn) || !data.left_text || !Array.isArray(data.left_text) || !data.right_text || !Array.isArray(data.right_text)) {
            console.warn(`Data for filter index ${index} has invalid structure.`);
            return null;
        }
        return data;
    }, [attentionData, selectedFilter]);

    // --- Derived State & Calculations ---
    const { attn: rawAttn, left_text: rawLeftText, right_text: rawRightText } = currentAttData || { attn: [], left_text: [], right_text: [] };

    const numRawLayers = rawAttn.length;
    // Handle case where first layer might be empty or data is malformed
    const numRawHeads = (rawAttn[0] && Array.isArray(rawAttn[0])) ? rawAttn[0].length : 0;

    // Determine the original layer/head indices to include
    const layersToInclude = useMemo(() => propIncludeLayers ?? Array.from({ length: numRawLayers }, (_, i) => i), [propIncludeLayers, numRawLayers]);
    const headsToInclude = useMemo(() => propIncludeHeads ?? Array.from({ length: numRawHeads }, (_, i) => i), [propIncludeHeads, numRawHeads]);

    // Filter the attention data based on included layers/heads
    // `attn` will be the filtered data: (number[][] | null)[][] where null indicates invalid/filtered-out data
    // `layerHeadMap` stores the mapping from view indices back to original indices
    // Filter the attention data based on included layers/heads
    // `attn` will be the filtered data: (AttentionMatrix | null)[][]
    // `layerHeadMap` stores the mapping from view indices back to original indices
    const { attn, leftText, rightText, layerHeadMap } = useMemo(() => {
        if (!currentAttData) return { attn: [], leftText: [], rightText: [], layerHeadMap: [] };

        const validLayers = layersToInclude.filter(l => l >= 0 && l < numRawLayers);
        const validHeads = headsToInclude.filter(h => h >= 0 && h < numRawHeads);

        const newLayerHeadMap: { layer: number; head: number }[][] = [];
        const filteredAttn: (AttentionMatrix | null)[][] = []; // Explicitly allow null

        validLayers.forEach((layerIndex, layerIndexInView) => {
            const layerAttnData = rawAttn[layerIndex]; // Should be number[][] theoretically

            // Basic check if layer data itself exists and is an array
            if (!layerAttnData || !Array.isArray(layerAttnData)) {
                console.warn(`Data for layer index ${layerIndex} is missing or invalid.`);
                // Fill the row with nulls for this layer in the filtered view
                filteredAttn[layerIndexInView] = new Array(validHeads.length).fill(null);
                newLayerHeadMap[layerIndexInView] = validHeads.map(headIndex => ({ layer: layerIndex, head: headIndex })); // Map even if data is null
                return; // Skip processing heads for this invalid layer
            }

            const headRowAttn: (AttentionMatrix | null)[] = [];
            const headRowMap: { layer: number; head: number }[] = [];

            validHeads.forEach((headIndex, headIndexInView) => {
                 // ---- START FIX ----
                 // 1. Get the data as unknown first to bypass potentially incorrect inference.
                 const headAttnData: unknown = layerAttnData[headIndex];

                 // 2. Perform robust type checks on the unknown value.
                 let isValidAttentionMatrix = false;
                 if (
                     headAttnData && // Check for null/undefined
                     Array.isArray(headAttnData) // Check it's an array (outer)
                 ) {
                      // Check if it's empty OR if the first element is an array
                      if (headAttnData.length === 0 || Array.isArray(headAttnData[0])) {
                           // Further check: if the first inner array exists, check its first element type (basic check for number[][])
                           // Note: This doesn't guarantee *all* inner elements are numbers, but matches the original check's strictness.
                           // A more robust check would iterate, but can be costly.
                           if (headAttnData.length === 0 || headAttnData[0].length === 0 || typeof headAttnData[0][0] === 'number') {
                                isValidAttentionMatrix = true;
                           }
                      }
                 }

                 // 3. If the checks pass, *now* assert the type.
                 if (isValidAttentionMatrix) {
                     headRowAttn[headIndexInView] = headAttnData as AttentionMatrix; // Cast is now safer after checks
                     headRowMap[headIndexInView] = { layer: layerIndex, head: headIndex };
                 } else {
                     console.warn(`Data for layer ${layerIndex}, head ${headIndex} is not a valid AttentionMatrix (number[][]). Found:`, headAttnData);
                     headRowAttn[headIndexInView] = null; // Mark as null if invalid
                     headRowMap[headIndexInView] = { layer: layerIndex, head: headIndex }; // Keep mapping
                 }
                 // ---- END FIX ----
            });
            filteredAttn[layerIndexInView] = headRowAttn;
            newLayerHeadMap[layerIndexInView] = headRowMap;
        });

        return {
            attn: filteredAttn,
            leftText: currentAttData.left_text,
            rightText: currentAttData.right_text,
            layerHeadMap: newLayerHeadMap
        };
    }, [currentAttData, layersToInclude, headsToInclude, numRawLayers, numRawHeads]); // Dependencies remain the same
    const numLayersInView = attn.length;
    const numHeadsInView = attn[0]?.length || 0; // Use filtered attn dimensions

    // Calculate dimensions (ensure totalHeads > 0)
    const safeTotalHeads = Math.max(1, totalHeads); // Prevent division by zero
    const axisSize = HEADING_TEXT_SIZE + HEADING_PADDING + TEXT_SIZE + TEXT_PADDING;
    const thumbnailBoxHeight = 7 * (12 / safeTotalHeads); // Scale based on original total heads
    const thumbnailHeight = Math.max(leftText.length, rightText.length) * thumbnailBoxHeight + 2 * THUMBNAIL_PADDING;
    const thumbnailWidth = numHeadsInView > 0 ? (DIV_WIDTH - axisSize) / numHeadsInView : 0; // Prevent division by zero
    const detailHeight = Math.max(leftText.length, rightText.length) * DETAIL_BOX_HEIGHT + 2 * DETAIL_PADDING + DETAIL_HEADING_HEIGHT;
    // Ensure divHeight calculation handles cases with zero layers/heads gracefully
    const viewHeight = numLayersInView > 0 ? numLayersInView * thumbnailHeight + axisSize : axisSize;
    const divHeight = Math.max(viewHeight, detailHeight > 0 && detailLayerIndexInView !== null ? detailHeight + MIN_Y + 5 : axisSize);

    const tableWidth = thumbnailWidth * numHeadsInView;

    // --- Helper Functions ---
    const getOriginalLayerIndex = useCallback((layerIndexInView: number): number | undefined => {
        // Use the map; first head's layer index should be representative for the row
         return layerHeadMap[layerIndexInView]?.[0]?.layer;
    }, [layerHeadMap]);

     const getOriginalHeadIndex = useCallback((layerIndexInView: number, headIndexInView: number): number | undefined => {
         return layerHeadMap[layerIndexInView]?.[headIndexInView]?.head;
     }, [layerHeadMap]);

    const getLayerColor = useCallback((layerIndexInView: number) => {
        const originalLayerIndex = getOriginalLayerIndex(layerIndexInView);
        // Handle cases where the layer might not map correctly (e.g., empty filtered data)
        if (originalLayerIndex === undefined) return '#888'; // Default fallback color
        return LAYER_COLORS[originalLayerIndex % 10];
    }, [getOriginalLayerIndex]); // Depends on the mapping

    const getTextColor = useCallback(() => PALETTE[displayMode].text, [displayMode]);
    const getBackgroundColor = useCallback(() => PALETTE[displayMode].background, [displayMode]);
    const getHighlightColor = useCallback(() => PALETTE[displayMode].highlight, [displayMode]);

    // --- D3 Rendering Effect ---
    useEffect(() => {
        // --- Effect Cleanup Function ---
        // Store D3 selections that have event listeners attached
         const clickRegions: Selection<SVGRectElement, unknown, BaseType, unknown>[] = [];

         // Cleanup function to remove listeners
         const cleanup = () => {
             clickRegions.forEach(sel => sel.on('click', null)); // Remove click listeners
             // Also remove hover listeners from text areas if added
             if (svgRef.current) {
                  d3.select(svgRef.current).selectAll("#leftText .hover-area")
                      .on("mouseover", null)
                      .on("mouseleave", null);
             }
             clickRegions.length = 0; // Clear the array
         };
        // --- End Effect Cleanup ---

        if (!svgRef.current) {
            return cleanup; // Return cleanup if ref not available
        }
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove(); // Clear previous render

        // Check for necessary data *after* clearing
        if (!currentAttData || numHeadsInView === 0 || numLayersInView === 0 || thumbnailWidth <= 0) {
            svg.attr("width", DIV_WIDTH).attr("height", 50).style("background-color", getBackgroundColor()); // Minimal size
            // Maybe add a text message inside SVG?
            svg.append("text")
                .attr("x", 10)
                .attr("y", 25)
                .attr("fill", getTextColor())
                .text("No attention data to display with current filters.");
            return cleanup; // Return cleanup
        }


        // Set dimensions and background
        svg.attr("width", DIV_WIDTH)
           .attr("height", divHeight)
           .style("background-color", getBackgroundColor());


        // --- Rendering Functions (defined inside useEffect to capture scope) ---

        function renderAxisLabels() {
            // Heads Axis
            svg.append("text")
                .text("Heads")
                .attr("fill", getTextColor())
                .attr("font-weight", "bold")
                .attr("font-size", HEADING_TEXT_SIZE + "px")
                .attr("x", axisSize + tableWidth / 2)
                .attr("text-anchor", "middle")
                .attr("y", 0)
                .attr("dy", HEADING_TEXT_SIZE);

            // Iterate through the view indices, get original head index from map
            for (let j = 0; j < numHeadsInView; j++) {
                 // Assume layer 0 exists if numLayersInView > 0
                 const originalHeadIndex = getOriginalHeadIndex(0, j);
                 svg.append("text")
                    .text(originalHeadIndex !== undefined ? originalHeadIndex : '?') // Display original head index or '?'
                    .attr("fill", getTextColor())
                    .attr("font-size", TEXT_SIZE + "px")
                    .attr("x", axisSize + (j + .5) * thumbnailWidth)
                    .attr("text-anchor", "middle")
                    .attr("y", HEADING_TEXT_SIZE + HEADING_PADDING)
                    .attr("dy", TEXT_SIZE);
            }

            // Layers Axis
            const layersAxisX = TEXT_PADDING;
            const layersAxisY = axisSize + (thumbnailHeight * numLayersInView) / 2;

             svg.append("text")
                .text("Layers")
                .attr("fill", getTextColor())
                .attr("font-weight", "bold")
                .attr("transform", `rotate(270, ${layersAxisX + HEADING_TEXT_SIZE / 2}, ${layersAxisY})`)
                .attr("font-size", HEADING_TEXT_SIZE + "px")
                .attr("x", layersAxisX + HEADING_TEXT_SIZE / 2) // Position before rotation
                .attr("text-anchor", "middle")
                .attr("y", layersAxisY) // Position before rotation
                .attr("dy", HEADING_TEXT_SIZE); // Adjust vertical position after rotation

            // Iterate through view indices, get original layer index from map
             for (let i = 0; i < numLayersInView; i++) {
                 const originalLayerIndex = getOriginalLayerIndex(i);
                 const layerLabelX = HEADING_TEXT_SIZE + HEADING_PADDING + TEXT_SIZE + TEXT_PADDING; // Keep some space
                 const layerLabelY = axisSize + (i + .5) * thumbnailHeight;
                 svg.append("text")
                    .text(originalLayerIndex !== undefined ? originalLayerIndex : '?') // Display original layer index or '?'
                    .attr("fill", getTextColor())
                    .attr("font-size", TEXT_SIZE + "px")
                    .attr("x", layerLabelX)
                    .attr("text-anchor", "end")
                    .attr("y", layerLabelY)
                    .attr("dy", TEXT_SIZE / 2); // Center vertically
            }
        }

        function renderThumbnail(layerIndexInView: number, headIndexInView: number) {
            const x = axisSize + headIndexInView * thumbnailWidth;
            const y = axisSize + layerIndexInView * thumbnailHeight;
            // Access the potentially null attention data for this view cell
            const headAttn = attn[layerIndexInView]?.[headIndexInView];

            // Use the validated headAttn (which is AttentionMatrix | null)
            if (headAttn) {
                 // headAttn is guaranteed to be number[][] here
                 renderThumbnailAttn(x, y, headAttn, layerIndexInView, headIndexInView);
            } else {
                 // headAttn is null (or undefined, though filter logic uses null)
                 renderThumbnailBackgroundOnly(x, y, layerIndexInView, headIndexInView);
            }
        }

        function renderThumbnailBackgroundOnly(x: number, y: number, layerIndexInView: number, headIndexInView: number) {
             const attnContainer = svg.append("g");
             const layerColor = getLayerColor(layerIndexInView);

             attnContainer.append("rect")
                .attr("id", `attn_background_${layerIndexInView}_${headIndexInView}`)
                .classed("attn_background", true)
                .attr("x", x)
                .attr("y", y)
                .attr("height", thumbnailHeight)
                .attr("width", thumbnailWidth)
                .attr("stroke-width", 2)
                .attr("stroke", layerColor)
                .attr("stroke-opacity", 0.4) // Indicate missing/error data
                .attr("fill", getBackgroundColor()) // Or a slightly different "disabled" background
                .style("pointer-events", "none"); // Don't make background clickable if no data

             // Optional: Add text indicating no data?
             // attnContainer.append("text")
             //    .attr(...)
             //    .text("N/A");
        }

        // This function now correctly receives `att` as AttentionMatrix (number[][])
        function renderThumbnailAttn(x: number, y: number, att: AttentionMatrix, layerIndexInView: number, headIndexInView: number) {
            const attnContainer = svg.append("g");
            const layerColor = getLayerColor(layerIndexInView);

            const attnBackground = attnContainer.append("rect")
                .attr("id", `attn_background_${layerIndexInView}_${headIndexInView}`)
                .classed("attn_background", true)
                .attr("x", x)
                .attr("y", y)
                .attr("height", thumbnailHeight)
                .attr("width", thumbnailWidth)
                .attr("stroke-width", 2)
                .attr("stroke", layerColor)
                .attr("stroke-opacity", 0) // Initially hidden, shown on click
                .attr("fill", getBackgroundColor());

            const x1 = x + THUMBNAIL_PADDING;
            const x2 = x + thumbnailWidth - THUMBNAIL_PADDING;
            const y1 = y + THUMBNAIL_PADDING;

             // Create groups for each source token
             attnContainer.selectAll(".thumbnail-line-group")
                 .data(att) // att is number[][]
                 .enter()
                 .append("g")
                 .classed("thumbnail-line-group", true)
                 .attr("source-index", (_, i) => i)
                 .each(function(sourceAttentions, sourceIndex) { // sourceAttentions is number[]
                     const g = d3.select(this);
                     g.selectAll("line")
                         .data(sourceAttentions) // data is number (attention value)
                         .enter()
                         .append("line")
                         .attr("x1", x1)
                         .attr("y1", y1 + (sourceIndex + 0.5) * thumbnailBoxHeight)
                         .attr("x2", x2)
                         .attr("y2", (d, targetIndex) => y1 + (targetIndex + 0.5) * thumbnailBoxHeight)
                         .attr("stroke-width", 1.5)
                         .attr("stroke", layerColor)
                         .attr("stroke-opacity", d => Math.sqrt(d));
                 });

            // Clickable overlay rect
            const clickRegion = attnContainer.append("rect")
                .attr("x", x)
                .attr("y", y)
                .attr("height", thumbnailHeight)
                .attr("width", thumbnailWidth)
                .style("opacity", 0) // Invisible
                .style("cursor", "pointer");

            clickRegions.push(clickRegion); // Store for cleanup

            clickRegion.on("click", () => {
                 // Use view indices for state
                 const currentlySelected = detailLayerIndexInView === layerIndexInView && detailHeadIndexInView === headIndexInView;

                 // Clear previous detail and highlights BEFORE setting new state
                 clearDetailView();
                 svg.selectAll(".attn_background")
                    .attr("fill", getBackgroundColor())
                    .attr("stroke-opacity", 0);

                 if (!currentlySelected) {
                     // Render new detail view using the validated `att` data
                     renderDetail(att, layerIndexInView, headIndexInView); // Pass view indices
                     setDetailLayerIndexInView(layerIndexInView);
                     setDetailHeadIndexInView(headIndexInView);
                     // Highlight the clicked thumbnail's background
                     attnBackground.attr("fill", getHighlightColor()).attr("stroke-opacity", 0.8);
                 } else {
                     // If it was already selected, clicking again just closes it.
                     // State is cleared by clearDetailView called above.
                     setDetailLayerIndexInView(null);
                     setDetailHeadIndexInView(null);
                 }
            });
        }

        function clearDetailView() {
            svg.selectAll(".detail").remove();
             // Don't reset state here, let the click handler do it or handle externally if needed
             // setDetailLayerIndexInView(null);
             // setDetailHeadIndexInView(null);
        }

        // This function now correctly receives `att` as AttentionMatrix (number[][])
        // It also receives view indices
        function renderDetail(att: AttentionMatrix, layerIndexInView: number, headIndexInView: number) {
            // Get original indices for display purposes
            const originalLayer = getOriginalLayerIndex(layerIndexInView);
            const originalHead = getOriginalHeadIndex(layerIndexInView, headIndexInView);

            const leftPos = axisSize + headIndexInView * thumbnailWidth;
            const thumbnailTop = axisSize + layerIndexInView * thumbnailHeight;
            const xOffset = 10;
            const yOffset = 0; // Align top with thumbnail top?

            // Calculate potential positions
            let potentialX = leftPos + thumbnailWidth + xOffset; // Try right
            let potentialY = thumbnailTop + yOffset;

            // Adjust X if goes off right edge
            if (potentialX + DETAIL_WIDTH + 2 * DETAIL_PADDING > DIV_WIDTH) {
                 potentialX = leftPos - (DETAIL_WIDTH + 2 * DETAIL_PADDING) - xOffset; // Try left
            }
            // Adjust X if goes off left edge (snap to MIN_X)
             potentialX = Math.max(MIN_X, potentialX);


            // Adjust Y if goes off bottom edge
            const maxY = divHeight - 5; // Max Y boundary considering SVG height
             potentialY = Math.min(potentialY, maxY - detailHeight);

            // Adjust Y if goes off top edge (snap to MIN_Y)
             potentialY = Math.max(MIN_Y, potentialY);


            const x = potentialX;
            const y = potentialY;

            const detailGroup = svg.append("g").classed("detail", true);

            renderDetailFrame(detailGroup, x, y, layerIndexInView); // Pass view index for color

            const contentX = x + DETAIL_PADDING;
            const contentY = y + DETAIL_PADDING;

            // Pass original indices for the heading text
            renderDetailHeading(detailGroup, contentX, contentY, originalLayer, originalHead);
            const textY = contentY + DETAIL_HEADING_HEIGHT;

            renderDetailText(detailGroup, leftText, "leftText", contentX, textY);
            // Pass validated `att` data and view index for color
            renderDetailAttn(detailGroup, contentX + DETAIL_BOX_WIDTH + DETAIL_PADDING, textY, att, layerIndexInView);
            renderDetailText(detailGroup, rightText, "rightText", contentX + DETAIL_BOX_WIDTH + DETAIL_PADDING + DETAIL_ATTENTION_WIDTH + DETAIL_PADDING, textY);
        }

        function renderDetailFrame(parent: SVGGroupSelection, x: number, y: number, layerIndexInView: number) {
            parent.append("rect")
                .classed("detail-frame", true)
                .attr("x", x)
                .attr("y", y)
                .attr("height", detailHeight)
                .attr("width", DETAIL_WIDTH + 2 * DETAIL_PADDING)
                .style("fill", getBackgroundColor())
                .style("opacity", 0.95)
                .attr("stroke-width", 1.5)
                .attr("stroke-opacity", 0.7)
                .attr("stroke", getLayerColor(layerIndexInView)); // Use view index for color
        }

        // Receives original layer/head indices for display
        function renderDetailHeading(parent: SVGGroupSelection, x: number, y: number, originalLayerIndex: number | undefined, originalHeadIndex: number | undefined) {
            const headingX = x + DETAIL_WIDTH / 2;
            const layerText = originalLayerIndex !== undefined ? `Layer ${originalLayerIndex}` : 'Layer ?';
            const headText = originalHeadIndex !== undefined ? `Head ${originalHeadIndex}` : 'Head ?';

            parent.append("text")
                .classed("detail-heading", true)
                .text(`${layerText}, ${headText}`)
                .attr("font-size", TEXT_SIZE + "px")
                .attr("font-weight", "bold")
                .style("cursor", "default")
                .style("user-select", "none")
                .attr("fill", getTextColor())
                .attr("x", headingX)
                .attr("text-anchor", "middle")
                .attr("y", y)
                .attr("dy", HEADING_TEXT_SIZE);
        }

        function renderDetailText(parent: SVGGroupSelection, text: string[], id: string, x: number, y: number) {
            const tokenContainer = parent.append("g").attr("id", id);

            const tokens = tokenContainer.selectAll<SVGGElement, string>(".token-group")
                .data(text)
                .enter()
                .append("g")
                .classed("token-group", true)
                .attr("data-index", (d, i) => i);

            tokens.append("rect")
                .classed("highlight", true)
                .attr("fill", getHighlightColor())
                .style("opacity", 0.0) // Initially hidden
                .attr("height", DETAIL_BOX_HEIGHT)
                .attr("width", DETAIL_BOX_WIDTH)
                .attr("x", x)
                .attr("y", (d, i) => y + i * DETAIL_BOX_HEIGHT);

            tokens.append("text")
                .classed("token", true)
                .text(d => d)
                .attr("font-size", TEXT_SIZE + "px")
                .style("cursor", "default")
                .style("user-select", "none")
                .attr("fill", getTextColor())
                .attr("x", x)
                .attr("y", (d, i) => y + i * DETAIL_BOX_HEIGHT)
                .attr("dy", TEXT_SIZE + (DETAIL_BOX_HEIGHT - TEXT_SIZE) / 2 - 1) // Vertical align adjustment
                .attr("height", DETAIL_BOX_HEIGHT)
                .attr("width", DETAIL_BOX_WIDTH);

            if (id === "leftText") {
                tokens.select("text")
                    .style("text-anchor", "end")
                    .attr("dx", DETAIL_BOX_WIDTH - TEXT_PADDING);

                // Add invisible rect for hover
                tokens.append("rect")
                    .classed("hover-area", true)
                    .attr("x", x)
                    .attr("y", (d, i) => y + i * DETAIL_BOX_HEIGHT)
                    .attr("width", DETAIL_BOX_WIDTH)
                    .attr("height", DETAIL_BOX_HEIGHT)
                    .style("fill", "transparent")
                    .style("cursor", "pointer")
                    // --- Attach hover listeners ---
                    .on("mouseover", function(event: MouseEvent, d: string) { // Use function to get 'this'
                        const groupElement = this.closest('.token-group'); // Find parent group
                        const indexStr = groupElement?.getAttribute('data-index');
                        if (indexStr !== null && indexStr !== undefined && indexStr !== "") {
                             const index = parseInt(indexStr, 10);
                             if (!isNaN(index)) {
                                 highlightSelection(index);
                             } else {
                                console.error("Invalid non-numeric data-index:", indexStr);
                             }
                        } else {
                             console.error("Missing or empty data-index attribute on token group.");
                        }
                    })
                    .on("mouseleave", function(event: MouseEvent, d: string) { // Use function to get 'this'
                        unhighlightSelection();
                    });
                    // --- End hover listeners ---

            } else if (id === "rightText") {
                 tokens.select("text")
                    .attr("dx", TEXT_PADDING);
            }
        }

        function highlightSelection(sourceIndex: number) {
            // Highlight source token background
            svg.select(".detail #leftText") // Scope selector to detail view
                .selectAll<SVGRectElement, string>(".highlight")
                .filter((d, i) => i === sourceIndex) // Select only the matching index
                .style("opacity", 1.0);

             // Dim irrelevant target token backgrounds (optional)
             svg.select(".detail #rightText")
                 .selectAll<SVGRectElement, string>(".token-group .highlight") // Select background rects in right text
                 // You might want to add logic here based on attention values if desired
                 // .style("opacity", (d, i) => /* determine opacity based on attention from sourceIndex */);

            // Highlight the attention lines originating from the selected source token
             svg.select(".detail .detail-attention") // Scope selector
                 .selectAll<SVGGElement, AttentionMatrix>(".attn-line-group") // Select groups (datum is number[][])
                 .style("opacity", (d, i) => i === sourceIndex ? 1.0 : 0.1); // Dim groups not matching source index
        }

        function unhighlightSelection() {
            // Remove highlight from left token background
             svg.select(".detail #leftText")
                .selectAll(".highlight")
                .style("opacity", 0.0);

            // Remove highlight from right token backgrounds (if applied)
            svg.select(".detail #rightText")
                 .selectAll(".highlight")
                 .style("opacity", 0.0);

            // Restore full opacity for all attention line groups in the detail view
            svg.select(".detail .detail-attention")
                .selectAll(".attn-line-group")
                .style("opacity", 1.0);
        }

        // This function now correctly receives `att` as AttentionMatrix (number[][])
        function renderDetailAttn(parent: SVGGroupSelection, x: number, y: number, att: AttentionMatrix, layerIndexInView: number) {
            const attnContainer = parent.append("g")
                .classed("detail-attention", true)
                .attr("pointer-events", "none"); // Prevent lines from intercepting mouse events

            const layerColor = getLayerColor(layerIndexInView); // Use view index

             // Create groups for each source token's attention lines
             attnContainer.selectAll(".attn-line-group")
                 .data(att) // att is number[][]
                 .enter()
                 .append("g")
                 .classed("attn-line-group", true)
                 .attr("source-index", (d, i) => i) // Store source index if needed
                 .each(function(sourceAttentions, sourceIndex) { // sourceAttentions is number[]
                     const g = d3.select(this);
                     g.selectAll("line")
                         .data(sourceAttentions) // data is attention value (number)
                         .enter()
                         .append("line")
                         .attr("x1", x + ATTN_PADDING)
                         .attr("y1", y + (sourceIndex + 0.5) * DETAIL_BOX_HEIGHT)
                         .attr("x2", x + DETAIL_ATTENTION_WIDTH - ATTN_PADDING)
                         .attr("y2", (d, targetIndex) => y + (targetIndex + 0.5) * DETAIL_BOX_HEIGHT)
                         .attr("stroke-width", 1.8)
                         .attr("stroke", layerColor)
                         // Ensure minimum visibility, but scale reasonably
                         .attr("stroke-opacity", d => Math.max(0.01, Math.min(1.0, d * 1.5))); // Slightly boost low values
                 });
        }

        // --- Initial Render Calls ---
        renderAxisLabels();

        for (let i = 0; i < numLayersInView; i++) {
            for (let j = 0; j < numHeadsInView; j++) {
                renderThumbnail(i, j); // Render using view indices
            }
        }

        // Re-render detail view if one was active (using view indices)
        if (detailLayerIndexInView !== null && detailHeadIndexInView !== null) {
            // Get the attention data for the stored *view* indices
            const detailAttnData = attn[detailLayerIndexInView]?.[detailHeadIndexInView];

            // Check if data for this view index is valid (not null)
            if (detailAttnData) { // detailAttnData is AttentionMatrix | null
                const activeThumbnailBg = svg.select(`#attn_background_${detailLayerIndexInView}_${detailHeadIndexInView}`);
                if (!activeThumbnailBg.empty()) {
                    activeThumbnailBg.attr("fill", getHighlightColor()).attr("stroke-opacity", 0.8);
                    // Pass the valid AttentionMatrix and view indices
                    renderDetail(detailAttnData, detailLayerIndexInView, detailHeadIndexInView);
                } else {
                     // Thumbnail not found, clear detail state (shouldn't happen often)
                    setDetailLayerIndexInView(null);
                    setDetailHeadIndexInView(null);
                }
            } else {
                 // Data was null for the previously selected view indices (e.g., filter changed)
                 // No need to clear view explicitly as it's cleared on every render cycle start
                 // But ensure state reflects that detail is no longer shown
                 // Note: This case might be handled implicitly if filter change resets state,
                 // but adding it here ensures robustness if state isn't reset externally.
                 if (detailLayerIndexInView !== null || detailHeadIndexInView !== null) {
                    setDetailLayerIndexInView(null);
                    setDetailHeadIndexInView(null);
                 }
            }
        }
        // --- End Initial Render Calls ---

        return cleanup; // Return the cleanup function

    }, [
        // Dependencies
        currentAttData, // Main data object for the selected filter
        attn, leftText, rightText, layerHeadMap, // Filtered data and mapping
        displayMode, totalHeads, // Config props
        numLayersInView, numHeadsInView, // Derived counts
        divHeight, thumbnailBoxHeight, thumbnailHeight, thumbnailWidth, detailHeight, tableWidth, // Calculated dimensions
        detailLayerIndexInView, detailHeadIndexInView, // State for detail view (view indices)
        getLayerColor, getTextColor, getBackgroundColor, getHighlightColor, // Memoized helpers
        getOriginalLayerIndex, getOriginalHeadIndex, // Memoized mapping helpers
        axisSize // Constant used in calculations
        // Removed direct dependencies on unfiltered props like attentionData, propInclude*, selectedFilter
        // as their effects are captured via currentAttData, attn, layerHeadMap etc.
    ]);

    // --- Event Handlers ---
    const handleFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedFilter(event.target.value);
        // Reset detail view state when filter changes, as view indices will be invalidated
        setDetailLayerIndexInView(null);
        setDetailHeadIndexInView(null);
    };

    // --- Render Component ---
    if (!attentionData || attentionData.length === 0) {
         return <div style={{ padding: '10px', color: 'grey', backgroundColor: 'white' }}>No attention data provided.</div>;
    }

    // Loading/Error states based on filtered data availability
    const showFilterSelector = attentionData.length > 1;
    let content;

    if (!currentAttData) {
        // Handle case where selectedFilter index is invalid after initial load or change
        content = <div style={{ padding: '10px', color: getTextColor() }}>Error: Invalid filter selected or data unavailable for filter '{selectedFilter}'.</div>;
    } else if (numLayersInView === 0 || numHeadsInView === 0) {
         // Handle case where filters result in nothing to show
         content = <div style={{ padding: '10px', color: getTextColor() }}>No layers or heads match the specified includeLayers/includeHeads filters for this item.</div>;
    } else {
        // Render the SVG (the useEffect will handle drawing)
        content = <svg ref={svgRef} id="vis" style={{ display: 'block', overflow: 'visible' }}></svg>;
    }

    return (
        <div className="bertviz-model-view" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", backgroundColor: getBackgroundColor() }}>
             {showFilterSelector && (
                 <div style={{ padding: '5px 10px' }}> {/* Wrap selector in a div for better layout control */}
                     <span style={{ userSelect: 'none', color: getTextColor(), marginRight: '5px' }}>
                         Attention:
                     </span>
                     <select id="filter" value={selectedFilter} onChange={handleFilterChange} style={{ marginLeft: '5px' }}>
                         {attentionData.map((item, index) => (
                             <option key={index} value={index.toString()}>{item.name || `Item ${index + 1}`}</option>
                         ))}
                     </select>
                 </div>
             )}
            {content}
        </div>
    );
};

export default ModelView;