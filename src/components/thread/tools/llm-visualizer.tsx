import { useStreamContext } from "@/providers/Stream";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { ensureToolCallsHaveResponses } from "@/lib/ensure-tool-responses";
import { Message } from "@langchain/langgraph-sdk";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "../../ui/label";
import { Button } from "../../ui/button";
import { Textarea } from "@/components/ui/textarea";

import { LoaderCircle, } from "lucide-react";


// --- Define Props for the LLM Viz tool (Now includes state + setters) ---
interface LLMVizToolProps {
    stream: ReturnType<typeof useStreamContext>;
    setFirstTokenReceived: React.Dispatch<React.SetStateAction<boolean>>;
    parentIsLoading: boolean;
    // --- State and Setters from Parent ---
    selectedModel: string | undefined;
    setSelectedModel: React.Dispatch<React.SetStateAction<string | undefined>>;
    selectedLayer: string | undefined;
    setSelectedLayer: React.Dispatch<React.SetStateAction<string | undefined>>;
    selectedHead: string | undefined;
    setSelectedHead: React.Dispatch<React.SetStateAction<string | undefined>>;
    controlText: string;
    setControlText: React.Dispatch<React.SetStateAction<string>>;
}

// --- LLM Visualization Tool Component (Uses props for state) ---
export const LLMVizTool: React.FC<LLMVizToolProps> = ({
    stream,
    setFirstTokenReceived,
    parentIsLoading,
    // Destructure state and setters from props
    selectedModel,
    setSelectedModel,
    selectedLayer,
    setSelectedLayer,
    selectedHead,
    setSelectedHead,
    controlText,
    setControlText,
}) => {
    // --- REMOVE internal useState hooks for controls ---

    // Options remain the same
    const modelOptions = ["gpt2", "bert-base-uncased", "llama-7b"];
    const layerOptions = Array.from({ length: 12 }, (_, i) => String(i + 1));
    const headOptions = Array.from({ length: 12 }, (_, i) => String(i + 1));

    const handleControlSubmit = () => {
        if (parentIsLoading) return;
        setFirstTokenReceived(false);

        if (!selectedModel || !selectedLayer || !selectedHead || !controlText.trim()) {
            console.error("LLMVizTool: Missing required fields for submission.");
            toast.error("Please fill in all fields for the LLM Visualization tool."); // User feedback
            return;
        }

        // Use state values passed via props
        const messageContent = JSON.stringify({
            tool: "llm_visualization",
            model: selectedModel,
            layer: selectedLayer,
            head: selectedHead,
            text: controlText,
        });

        const newHumanMessage: Message = {
            id: uuidv4(),
            type: "human",
            content: messageContent,
        };

        const toolMessages = ensureToolCallsHaveResponses(stream.messages);
        stream.submit(
            { messages: [...toolMessages, newHumanMessage] },
            {
                streamMode: ["values"],
                optimisticValues: (prev) => ({
                    ...prev,
                    messages: [
                        ...(prev?.messages ?? []),
                        ...toolMessages,
                        newHumanMessage,
                    ],
                }),
            }
        );
    };

    return (
        <div className="flex flex-col gap-4 flex-1 p-4 border rounded-md shadow-sm">
            {/* Model Select - Uses props */}
            <div className="space-y-1">
                <Label htmlFor="model-select">Model</Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}> {/* Use prop + setter */}
                    <SelectTrigger id="model-select">
                        <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                        {modelOptions.map(model => (
                            <SelectItem key={model} value={model}>{model}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Layer Select - Uses props */}
            <div className="space-y-1">
                <Label htmlFor="layer-select">Layer</Label>
                <Select value={selectedLayer} onValueChange={setSelectedLayer}> {/* Use prop + setter */}
                    <SelectTrigger id="layer-select">
                        <SelectValue placeholder="Select layer" />
                    </SelectTrigger>
                    <SelectContent>
                        {layerOptions.map(layer => (
                            <SelectItem key={layer} value={layer}>{layer}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Head Select - Uses props */}
            <div className="space-y-1">
                <Label htmlFor="head-select">Head</Label>
                <Select value={selectedHead} onValueChange={setSelectedHead}> {/* Use prop + setter */}
                    <SelectTrigger id="head-select">
                        <SelectValue placeholder="Select head" />
                    </SelectTrigger>
                    <SelectContent>
                        {headOptions.map(head => (
                            <SelectItem key={head} value={head}>{head}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Text Input - Uses props */}
            <div className="space-y-1">
                <Label htmlFor="control-text-input">Input Text</Label>
                <Textarea
                    id="control-text-input"
                    value={controlText} // Use prop
                    onChange={(e) => setControlText(e.target.value)} // Use setter prop
                    placeholder="Enter text for analysis"
                    rows={4}
                    className="resize-none"
                />
            </div>

            {/* Submit Button for Controls - Uses props */}
            <Button
                onClick={handleControlSubmit}
                disabled={parentIsLoading || !controlText.trim() || !selectedModel || !selectedLayer || !selectedHead}
                className="mt-auto"
            >
                {parentIsLoading ? (
                    <>
                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                    </>
                ) : (
                    "Submit Request"
                )}
            </Button>
        </div>
    );
};

