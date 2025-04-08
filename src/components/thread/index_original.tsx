import { v4 as uuidv4 } from "uuid";
import { ReactNode, useEffect, useRef, useState, FormEvent } from "react"; // Added useState here
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useStreamContext } from "@/providers/Stream";
import { Button } from "../ui/button";
import { Checkpoint, Message } from "@langchain/langgraph-sdk";
import { AssistantMessage, AssistantMessageLoading } from "./messages/ai";
import { HumanMessage } from "./messages/human";
import {
  DO_NOT_RENDER_ID_PREFIX,
  ensureToolCallsHaveResponses,
} from "@/lib/ensure-tool-responses";
import { LangGraphLogoSVG } from "../icons/langgraph";
import { TooltipIconButton } from "./tooltip-icon-button";
import {
  ArrowDown,
  LoaderCircle,
  PanelRightOpen,
  PanelRightClose,
  SquarePen,
  ArrowLeft,
  Wrench,
  BrainCircuit,
  ScanText,
  Search
} from "lucide-react";
import { BooleanParam, StringParam, useQueryParam } from "use-query-params";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import ThreadHistory from "./history";
import { toast } from "sonner";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// --- Interfaces and Components (StickyToBottomContent, ScrollToBottom, ToolDefinition) remain the same ---
// (Keep existing StickyToBottomContent and ScrollToBottom components)
function StickyToBottomContent(props: {
  content: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const context = useStickToBottomContext();
  return (
    <div
      ref={context.scrollRef}
      style={{ width: "100%", height: "100%" }}
      className={props.className}
    >
      <div ref={context.contentRef} className={props.contentClassName}>
        {props.content}
      </div>

      {props.footer}
    </div>
  );
}

function ScrollToBottom(props: { className?: string }) {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  if (isAtBottom) return null;
  return (
    <Button
      variant="outline"
      className={props.className}
      onClick={() => scrollToBottom()}
    >
      <ArrowDown className="w-4 h-4" />
      <span>Scroll to bottom</span>
    </Button>
  );
}
interface ToolDefinition {
  id: string;
  name: string;
  description?: string;
  icon: React.ElementType;
  component: React.FC<any>; // Use 'any' for simplicity or create a base ToolProps interface
}
// --- End Interfaces and Components ---


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
const LLMVizTool: React.FC<LLMVizToolProps> = ({
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
// --- End LLM Visualization Tool Component ---


// --- Placeholder Tool Components (Remain the same) ---
const PlaceholderTool: React.FC<{ toolName: string }> = ({ toolName }) => (
  <div className="flex flex-col items-center justify-center text-center text-muted-foreground flex-1 p-4 border border-dashed rounded-md">
    <p className="font-semibold">{toolName}</p>
    <p className="text-sm mt-1">Tool UI not implemented yet.</p>
  </div>
);
const TokenAnalyzerTool: React.FC = () => <PlaceholderTool toolName="Token Analyzer" />;
const PromptExplorerTool: React.FC = () => <PlaceholderTool toolName="Prompt Explorer" />;
// --- End Placeholder Tool Components ---


export function Thread() {
  const [threadId, setThreadId] = useQueryParam("threadId", StringParam);
  const [chatHistoryOpen, setChatHistoryOpen] = useQueryParam(
    "chatHistoryOpen",
    BooleanParam,
  );
  const [hideToolCalls, setHideToolCalls] = useQueryParam(
    "hideToolCalls",
    BooleanParam,
  );
  const [input, setInput] = useState("");
  const [firstTokenReceived, setFirstTokenReceived] = useState(false);
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");

  // --- State for the LLM Visualization tool's controls (LIFTED HERE) ---
  const modelOptions = ["gpt2", "bert-base-uncased", "llama-7b"]; // Keep options easily accessible if needed
  const layerOptions = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const headOptions = Array.from({ length: 12 }, (_, i) => String(i + 1));

  const [llmVizModel, setLlmVizModel] = useState<string | undefined>(
    modelOptions.length > 0 ? modelOptions[0] : undefined
  );
  const [llmVizLayer, setLlmVizLayer] = useState<string | undefined>(
    layerOptions.length > 0 ? layerOptions[0] : undefined
  );
  const [llmVizHead, setLlmVizHead] = useState<string | undefined>(
    headOptions.length > 0 ? headOptions[0] : undefined
  );
  const [llmVizControlText, setLlmVizControlText] = useState("The quick brown fox.");
  // --- End LLM Viz State ---

  // --- State for Tool Panel (Remains the same) ---
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  // --- END Tool Panel State ---


  const stream = useStreamContext();
  const messages = stream.messages;
  const isLoading = stream.isLoading; // Use stream's loading state directly

  const lastError = useRef<string | undefined>(undefined);

  const historyPanelWidth = 300;
  const toolsPanelWidth = 288;

  // --- useEffect hooks for error handling and first token (Remain the same) ---
  useEffect(() => {
    if (!stream.error) {
      lastError.current = undefined;
      return;
    }
    try {
      const message = (stream.error as any).message;
      if (!message || lastError.current === message) {
        return;
      }
      lastError.current = message;
      toast.error("An error occurred. Please try again.", {
        description: (
          <p>
            <strong>Error:</strong> <code>{message}</code>
          </p>
        ),
        richColors: true,
        closeButton: true,
      });
    } catch {
      // no-op
    }
  }, [stream.error]);

  const prevMessageLength = useRef(0);
  useEffect(() => {
    if (
      messages.length !== prevMessageLength.current &&
      messages?.length &&
      messages[messages.length - 1].type === "ai"
    ) {
      setFirstTokenReceived(true);
    }
    prevMessageLength.current = messages.length;
  }, [messages]);
  // --- End useEffect hooks ---


  // --- Handlers (handleSubmit, handleRegenerate remain the same) ---
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    setFirstTokenReceived(false);

    const newHumanMessage: Message = {
      id: uuidv4(),
      type: "human",
      content: input,
    };

    const toolMessages = ensureToolCallsHaveResponses(stream.messages);
    stream.submit(
      { messages: [...toolMessages, newHumanMessage] },
      {
        streamMode: ["values"],
        optimisticValues: (prev) => ({
          ...prev,
          messages: [
            ...(prev?.messages ?? []), // Safe access
            ...toolMessages,
            newHumanMessage,
          ],
        }),
      },
    );

    setInput("");
  };

  // REMOVE handleControlSubmit from Thread - it's now inside LLMVizTool

  const handleRegenerate = (
    parentCheckpoint: Checkpoint | null | undefined,
  ) => {
    if (!messages?.length) return; // Cannot regenerate if no messages
    // Find the last AI message to regenerate from
    const lastAiMessageIndex = messages.findLastIndex(m => m.type === 'ai');
    if (lastAiMessageIndex === -1) return; // No AI message to regenerate

    // Adjust message length count if needed (might depend on exact logic)
    prevMessageLength.current = Math.max(0, prevMessageLength.current - 1);

    setFirstTokenReceived(false);
    stream.submit(undefined, {
      checkpoint: parentCheckpoint, // Use the checkpoint passed from AssistantMessage
      streamMode: ["values"],
      // Optimistic update: Remove messages after the point of regeneration
      // This might need adjustment based on how checkpoints relate to messages
      optimisticValues: (prev) => ({
        ...prev,
        messages: prev?.messages?.slice(0, lastAiMessageIndex) ?? [],
      }),
    });
  };
  // --- End Handlers ---


  const chatStarted = !!threadId || !!messages.length;

  // --- Define Available Tools (ensure LLMVizTool uses the correct props) ---
  const availableTools: ToolDefinition[] = [
    {
      id: 'llm-visualization',
      name: 'LLM Visualization',
      description: 'Explore model layers and attention heads.',
      icon: BrainCircuit,
      // Component now expects the lifted state props
      component: LLMVizTool, // LLMVizToolProps defined above
    },
    {
      id: 'token-analyzer',
      name: 'Token Analyzer',
      description: 'See how text is tokenized.',
      icon: ScanText,
      component: TokenAnalyzerTool, // Doesn't need special props
    },
    {
      id: 'prompt-explorer',
      name: 'Prompt Explorer',
      description: 'Experiment with different prompts.',
      icon: Search,
      component: PromptExplorerTool, // Doesn't need special props
    },
  ];
  // --- End Define Available Tools ---

  const SelectedToolDefinition = availableTools.find(tool => tool.id === selectedToolId);
  const SelectedToolComponent = SelectedToolDefinition?.component; // Get the component function


  return (
    // Main flex container
    <div className="flex w-full h-screen overflow-hidden">

      {/* --- History Panel (No change) --- */}
      <div className="relative lg:flex hidden shrink-0">
        <motion.div
          className="absolute h-full border-r bg-white overflow-hidden z-30"
          style={{ width: historyPanelWidth }}
          animate={
            isLargeScreen
              ? { x: chatHistoryOpen ? 0 : -historyPanelWidth }
              : { x: chatHistoryOpen ? 0 : -historyPanelWidth }
          }
          initial={{ x: -historyPanelWidth }}
          transition={
            isLargeScreen
              ? { type: "spring", stiffness: 300, damping: 30 }
              : { duration: 0 }
          }
        >
          <div className="relative h-full" style={{ width: historyPanelWidth }}>
            <ThreadHistory />
          </div>
        </motion.div>
      </div>
      {/* --- END History Panel --- */}

      {/* --- Tools Panel (Modified to pass props) --- */}
      <div className="w-72 p-4 border-r bg-gray-50 lg:flex hidden flex-col gap-4 shrink-0 h-full overflow-y-auto z-20">
        {/* Header (No change needed) */}
        <div className="flex items-center gap-2 pb-2 border-b mb-2">
          {selectedToolId && (
            <Button
              variant="ghost"
              size="icon"
              className="-ml-2 h-8 w-8"
              onClick={() => setSelectedToolId(null)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <h2 className="text-lg font-semibold flex-1 truncate">
            {SelectedToolDefinition ? SelectedToolDefinition.name : "Tools"}
          </h2>
        </div>

        {/* Conditional Content: Tool List or Selected Tool UI */}
        {!selectedToolId ? (
          // Tool List View (No change needed)
          <div className="flex flex-col gap-1">
            {availableTools.map((tool) => (
              <Button
                key={tool.id}
                variant="ghost"
                className="w-full justify-start h-auto py-2 px-3 text-left flex items-center gap-3"
                onClick={() => setSelectedToolId(tool.id)}
              >
                <tool.icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex flex-col flex-1 overflow-hidden">
                  <span className="font-medium text-sm truncate">{tool.name}</span>
                  {tool.description && (
                    <span className="text-xs text-muted-foreground truncate">
                      {tool.description}
                    </span>
                  )}
                </div>
              </Button>
            ))}
          </div>
        ) : SelectedToolComponent ? (
          // --- Selected Tool View (PASS PROPS HERE) ---
          <div className="flex flex-col flex-1 min-h-0">
            {/* Conditionally pass props based on the selected tool */}
            {selectedToolId === 'llm-visualization' ? (
              <SelectedToolComponent // This IS LLMVizTool
                // Pass required props for LLMVizTool
                stream={stream}
                setFirstTokenReceived={setFirstTokenReceived}
                parentIsLoading={isLoading}
                selectedModel={llmVizModel}
                setSelectedModel={setLlmVizModel}
                selectedLayer={llmVizLayer}
                setSelectedLayer={setLlmVizLayer}
                selectedHead={llmVizHead}
                setSelectedHead={setLlmVizHead}
                controlText={llmVizControlText}
                setControlText={setLlmVizControlText}
              />
            ) : (
              // Render other tools without the specific LLM viz props
              <SelectedToolComponent /* Pass other generic props if needed */ />
            )}
          </div>
        ) : (
          // Fallback (No change needed)
          <div className="text-red-500">Error: Tool component not found.</div>
        )}
      </div>
      {/* --- END Tools Panel --- */}


      {/* --- Chat Area (No functional change needed here, layout remains) --- */}
      <motion.div
        className={cn(
          "flex-1 flex flex-col min-w-0 overflow-hidden relative",
          !chatStarted && "grid-rows-[1fr]",
        )}
        layout={isLargeScreen}
      // Animation logic for margin/width can remain if desired,
      // but ensure it accounts for the tools panel width correctly.
      // It might be simpler to remove if complex interactions arise.
      >
        {/* Chat Header / Controls (No functional change needed) */}
        {!chatStarted && (
          <div className="absolute top-0 left-0 w-full flex items-center justify-between gap-3 p-2 pl-4 z-10">
            {(!chatHistoryOpen || !isLargeScreen) && (
              <Button
                className="hover:bg-gray-100"
                variant="ghost"
                onClick={() => setChatHistoryOpen((p) => !p)}
              >
                {chatHistoryOpen ? (
                  <PanelRightClose className="size-5" />
                ) : (
                  <PanelRightOpen className="size-5" />
                )}
              </Button>
            )}
          </div>
        )}
        {chatStarted && (
          <div className="flex items-center justify-between gap-3 p-2 pl-4 z-10 relative border-b">
            <div className="flex items-center justify-start gap-2">
              {(!chatHistoryOpen || !isLargeScreen) && (
                <Button
                  className="hover:bg-gray-100"
                  variant="ghost"
                  onClick={() => setChatHistoryOpen((p) => !p)}
                  aria-label={chatHistoryOpen ? "Close history panel" : "Open history panel"}
                >
                  {chatHistoryOpen ? (
                    <PanelRightClose className="size-5" />
                  ) : (
                    <PanelRightOpen className="size-5" />
                  )}
                </Button>
              )}
              <button
                className="flex gap-2 items-center cursor-pointer"
                onClick={() => setThreadId(null)}
              >
                <LangGraphLogoSVG width={32} height={32} />
                <span className="text-xl font-semibold tracking-tight">
                  Know Your LLM Chat
                </span>
              </button>
            </div>
            <TooltipIconButton
              size="lg"
              className="p-4 mr-2"
              tooltip="New thread"
              variant="ghost"
              onClick={() => setThreadId(null)}
            >
              <SquarePen className="size-5" />
            </TooltipIconButton>
          </div>
        )}
        {/* --- END Chat Header --- */}


        {/* --- Chat Messages Area (No functional change needed) --- */}
        <StickToBottom className="relative flex-1 overflow-hidden">
          <StickyToBottomContent
            className={cn(
              "absolute inset-0 overflow-y-scroll [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-transparent",
              !chatStarted && "flex flex-col items-center justify-center",
              chatStarted && "grid grid-rows-[1fr_auto]", // Ensure content area takes up space
            )}
            contentClassName="pt-8 pb-16 px-6 flex flex-col gap-4 w-full" // Use px-6 for padding
            content={
              <>
                {!chatStarted && (
                  <div className="text-center px-4">
                    <div className="flex flex-col items-center gap-3 mb-8">
                      <LangGraphLogoSVG className="flex-shrink-0 h-10 w-10" />
                      <h1 className="text-2xl font-semibold tracking-tight">
                        Know Your LLM Chat
                      </h1>
                    </div>
                    <p className="text-muted-foreground">
                      Use the controls in the Tools panel on the left,
                      or start a conversation below.
                    </p>
                  </div>
                )}
                {/* Message rendering logic remains the same */}
                {messages
                  .filter((m) => !m.id?.startsWith(DO_NOT_RENDER_ID_PREFIX))
                  .map((message, index) => {
                    const uniqueKey = message.id || `${message.type}-${index}-${Date.now()}`; // Ensure unique key
                    return message.type === "human" ? (
                      <HumanMessage
                        key={uniqueKey}
                        message={message}
                        isLoading={isLoading}
                      />
                    ) : (
                      <AssistantMessage
                        key={uniqueKey}
                        message={message}
                        isLoading={isLoading}
                        handleRegenerate={handleRegenerate}
                        hideToolCalls={hideToolCalls ?? false}
                      />
                    );
                  })}
                {isLoading && !firstTokenReceived && chatStarted && (
                  <AssistantMessageLoading />
                )}
              </>
            }
            footer={
              // Footer with input area remains the same
              <div className="sticky flex flex-col items-center gap-2 bottom-0 px-4 pt-4 bg-gradient-to-t from-background via-background to-transparent">
                <ScrollToBottom className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2" />
                <div className="bg-background border rounded-lg shadow-sm mb-4 w-full relative z-10 p-2 max-w-3xl mx-auto"> {/* Added max-width */}
                  <form
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-2"
                  >
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && !e.metaKey) {
                          e.preventDefault();
                          handleSubmit(e);
                        }
                      }}
                      placeholder="Or type a general message here..."
                      className="p-2 border-none bg-transparent shadow-none ring-0 outline-none focus:outline-none focus:ring-0 resize-none text-sm"
                      //  rows={1} // Let it grow naturally with min/max
                      minRows={1}
                      maxRows={6}
                    />
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="render-tool-calls"
                          checked={hideToolCalls ?? false}
                          onCheckedChange={(checked) => setHideToolCalls(checked)} // Ensure proper boolean handling
                          size="sm"
                        />
                        <Label
                          htmlFor="render-tool-calls"
                          className="text-xs text-gray-500"
                        >
                          Hide Tool Calls
                        </Label>
                      </div>
                      {isLoading ? (
                        <Button key="stop" onClick={() => stream.stop()} variant="secondary" size="sm">
                          <LoaderCircle className="w-4 h-4 animate-spin mr-1" />
                          Cancel
                        </Button>
                      ) : (
                        <Button
                          type="submit"
                          size="sm"
                          disabled={isLoading || !input.trim()}
                        >
                          Send
                        </Button>
                      )}
                    </div>
                  </form>
                </div>
              </div>
            }
          />
        </StickToBottom>
        {/* --- END Chat Messages Area --- */}

      </motion.div>
      {/* --- END Chat Area --- */}
    </div>
  );
}