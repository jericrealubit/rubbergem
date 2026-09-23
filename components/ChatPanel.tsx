"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { describeError } from "@/lib/shift-log";
import { useThemeSpring, fadeSlideIn } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MessageCircle, Send } from "lucide-react";

interface ChatMessage {
  id: number;
  shift_id: number;
  sender_name: string;
  is_operator: boolean;
  body: string;
  created_at: string;
}

export default function ChatPanel({ session }: { session: any }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [senderName, setSenderName] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("chat_sender_name") || "";
    }
    return "";
  });
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [wiggle, setWiggle] = useState(false);
  const prevUnreadRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const spring = useThemeSpring();

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("shift_messages")
      .select("*")
      .eq("shift_id", 1)
      .order("created_at", { ascending: true });

    if (data) {
      setMessages(data as ChatMessage[]);
    }
  };

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel("shift-messages-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shift_messages" },
        () => {
          fetchMessages();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Mark messages as seen while the dialog is open; compute unread count
  // (against the last-seen timestamp) once it's closed.
  useEffect(() => {
    if (open) {
      localStorage.setItem("chat_last_seen", new Date().toISOString());
      setUnreadCount(0);
    } else {
      const lastSeen = localStorage.getItem("chat_last_seen");
      const lastSeenTime = lastSeen ? new Date(lastSeen).getTime() : 0;
      const unread = messages.filter(
        (m) => new Date(m.created_at).getTime() > lastSeenTime,
      ).length;
      setUnreadCount(unread);
    }
  }, [messages, open]);

  // Wiggle the trigger icon when a new message arrives while the dialog is
  // closed, so an operator away from the panel notices it without a sound.
  useEffect(() => {
    if (!open && unreadCount > prevUnreadRef.current) {
      setWiggle(true);
      const t = setTimeout(() => setWiggle(false), 600);
      prevUnreadRef.current = unreadCount;
      return () => clearTimeout(t);
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount, open]);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ block: "end" });
    }
  }, [messages, open]);

  const isOperator = !!session;
  const canSend = !!body.trim() && (isOperator || !!senderName.trim());

  // Give operators a sensible starting name (their account email) the first
  // time they open the panel with the field still empty, rather than a blank
  // box with an invisible fallback.
  useEffect(() => {
    if (isOperator && !senderName) {
      setSenderName(session.user.email);
    }
  }, [isOperator]);

  const handleSend = async () => {
    const trimmedBody = body.trim();
    const trimmedName = isOperator
      ? senderName.trim() || session.user.email
      : senderName.trim();

    if (!trimmedBody || !trimmedName) return;

    setIsSending(true);
    try {
      if (senderName.trim()) {
        localStorage.setItem("chat_sender_name", senderName.trim());
      }

      const { error } = await supabase.from("shift_messages").insert([
        {
          shift_id: 1,
          sender_name: trimmedName,
          is_operator: isOperator,
          body: trimmedBody,
        },
      ]);
      if (error) throw error;

      setBody("");
    } catch (err) {
      console.error("Error sending message:", err);
      alert(
        `Failed to send message: ${describeError(err)}`,
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        className="relative p-1.5 rounded-lg hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label="Open chat"
        animate={wiggle ? { rotate: [0, -15, 15, -10, 10, 0] } : { rotate: 0 }}
        transition={{ duration: 0.5 }}
      >
        <MessageCircle className="w-5 h-5" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key={unreadCount}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.4 }}
              transition={spring}
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-white text-[9px] font-bold flex items-center justify-center leading-none"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[400px] flex flex-col max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Shift Chat</DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-[200px] max-h-[45vh] overflow-y-auto space-y-2 py-2">
            {messages.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">
                No messages yet.
              </p>
            )}
            <AnimatePresence initial={false}>
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  variants={fadeSlideIn}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={spring}
                  className={`flex flex-col max-w-[85%] ${
                    m.is_operator ? "ml-auto items-end" : "items-start"
                  }`}
                >
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide px-1">
                    {m.sender_name}
                  </span>
                  <div
                    className={`rounded-xl px-3 py-1.5 text-sm break-words ${
                      m.is_operator
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {m.body}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          <div className="space-y-2 pt-2 border-t border-border">
            <Input
              placeholder="Your name"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
            />
            <div className="flex items-end gap-2">
              <Textarea
                placeholder="Type a message..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="min-h-10"
              />
              <motion.div whileTap={{ scale: 0.85 }} transition={spring}>
                <Button
                  type="button"
                  size="icon"
                  onClick={handleSend}
                  disabled={!canSend || isSending}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </motion.div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
