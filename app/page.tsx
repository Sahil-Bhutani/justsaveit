"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { io, Socket } from "socket.io-client";
import { Check, ClipboardCopy, Copy, RefreshCcw, Trash2 } from "lucide-react";

const Homepage = () => {
  const [roomId, setRoomId] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [resData, setResData] = useState<{
    content?: string;
    last_modified?: string;
  }>({ content: "" });
  const [roomContent, setRoomContent] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [saveMsg, setSaveMsg] = useState<string>("saved.");
  const [isRoomIdChanged, setRoomIdChanged] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const roomIdRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const skipBroadcastRef = useRef<boolean>(false); // Prevent loop updates

  const now = useCallback(() => {
    const tzoffset = new Date().getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzoffset)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(roomContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    const clearedContent = "";
    setRoomContent(clearedContent);
    setSaveMsg("cleared.");
    setCleared(true);

    if (roomId && socketRef.current) {
      socketRef.current.emit("content-update", {
        roomId,
        content: clearedContent,
      });
    }

    setTimeout(() => setCleared(false), 2000);
  };

  const getDateFormat = useCallback((dateStr: string) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    };
    return `Last Modified - ${new Date(dateStr).toLocaleString(
      "en-US",
      options
    )}`;
  }, []);

  const characterSaveMsg = useCallback(() => {
    return roomContent.length === 0
      ? `No character ${saveMsg}`
      : `${roomContent.length} character ${saveMsg}`;
  }, [roomContent, saveMsg]);

  const focusRoomContent = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      textareaRef.current?.focus();
    }
  };

  const handleRoomId = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newId = e.target.value.trim();
    setRoomId(newId);
    setRoomContent("");
    setResData({ content: "", last_modified: "" });
    setRoomIdChanged(true);
    setSaveMsg("");
    setHasFetched(false);
  }, []);

  const handleRoomContent = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value;
      setRoomContent(newContent);

      if (skipBroadcastRef.current) {
        skipBroadcastRef.current = false;
        return;
      }

      if (roomId && roomId.trim().length > 0 && socketRef.current) {
        setSaveMsg("saving...");
        socketRef.current.emit("content-update", {
          roomId,
          content: newContent,
        });
      } else {
        console.warn("❌ No roomId or socketRef missing");
      }
    },
    [roomId]
  );

  const fetchRoomData = useCallback(
    async (id: string) => {
      try {
        const res = await fetch("/api/createroom", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room_id: id }),
        });

        const data = await res.json();

        if (data.status === "success" || data.status === "already") {
          setResData({
            ...data.data,
            last_modified: getDateFormat(data.data.last_modified),
          });

          if (data.status === "already") {
            setRoomContent(data.data.content);
          }

          setSaveMsg("saved.");
          setRoomIdChanged(false);
          setHasFetched(true);
          localStorage.setItem("localRoomId", id);
        } else {
          setError("Failed to create or retrieve room.");
        }
      } catch (err) {
        console.error(err);
        setError("Something went wrong. Please try again later.");
      }
    },
    [getDateFormat]
  );

  useEffect(() => {
    if (isRoomIdChanged && roomId?.length > 0) {
      const timeout = setTimeout(() => {
        fetchRoomData(roomId);
      }, 1000);

      return () => clearTimeout(timeout); // cleanup on re-render
    }
  }, [isRoomIdChanged, roomId, fetchRoomData]);

  useEffect(() => {
    const id = localStorage.getItem("localRoomId");
    if (id) {
      setRoomId(id);
      fetchRoomData(id);
    }
  }, [fetchRoomData]);

  // WebSocket connection and room joining
  useEffect(() => {
    if (!roomId || !hasFetched) return;

    if (!socketRef.current) {
      socketRef.current = io("https://justsaveit-backend.onrender.com"); // Update if using in production

      socketRef.current.on("connect", () => {
        console.log("Socket connected:", socketRef.current?.id);
      });

      socketRef.current.on("receive-update", (incomingContent: string) => {
        if (incomingContent !== roomContent) {
          skipBroadcastRef.current = true;
          setRoomContent(incomingContent);
          setSaveMsg("updated remotely");
        }
      });
    }

    socketRef.current.emit("join-room", roomId);

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [roomId, hasFetched]);

  // Auto-saving updated content to the server
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    if (
      roomId.length > 0 &&
      hasFetched &&
      (resData.content ?? "") !== roomContent
    ) {
      timeoutId = setTimeout(() => {
        fetch("/api/updateroom", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room_id: roomId,
            content: roomContent,
            last_modified: now(),
          }),
        })
          .then((res) => res.json())
          .then(() => {
            setSaveMsg("saved.");
            setResData((prev) => ({
              ...prev,
              last_modified: getDateFormat(now()),
            }));
          });
      }, 1000);
    }

    return () => clearTimeout(timeoutId);
  }, [roomContent, roomId, resData.content, now, getDateFormat, hasFetched]);

  useEffect(() => {
    if (!socketRef.current) return;

    const handleReceiveUpdate = (incomingContent: string) => {
      if (incomingContent !== roomContent) {
        skipBroadcastRef.current = true;
        setRoomContent(incomingContent);
        setSaveMsg("updated remotely");
      }
    };

    socketRef.current.on("receive-update", handleReceiveUpdate);

    return () => {
      socketRef.current?.off("receive-update", handleReceiveUpdate); // cleanup
    };
  }, [roomContent]);

  return (
    <>
      <nav className="bg-black text-white text-center p-4 font-bold text-base sticky top-0 z-50">
        A clean space for your words — always within reach
      </nav>

      {error ? (
        <div className="h-[90vh] flex flex-col items-center justify-center text-center space-y-4">
          <h1 className="text-2xl font-semibold text-gray-800">
            We’re having trouble loading this. Hang tight
          </h1>
          <p className="text-sm text-gray-500">
            Please check your connection or try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 cursor-pointer px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition text-sm"
          >
            <RefreshCcw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      ) : (
        <div className="container max-w-6xl mx-auto mt-6 space-y-4 p-4">
          <Input
            type="text"
            placeholder="Enter room id"
            value={roomId}
            ref={roomIdRef}
            onKeyDown={focusRoomContent}
            onChange={handleRoomId}
            style={{ border: "1px solid lightgray" }}
          />
          <div className="relative">
            <Textarea
              placeholder={hasFetched ? "Your content..." : "Please wait…"}
              value={roomContent}
              onChange={handleRoomContent}
              ref={textareaRef}
              rows={12}
              disabled={!hasFetched}
              className="border border-gray-300 focus:ring-2 focus:ring-black focus:outline-none mt-2 resize-none "
              style={{ maxHeight: "360px" }}
            />
            <div className="absolute end-0 bottom-0 flex h-9 items-center pe-2">
              <div className="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs">
                <button
                  className="flex gap-1 items-center select-none py-1 cursor-pointer"
                  aria-label="Copy"
                  onClick={handleCopy}
                  disabled={!hasFetched}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-green-600 transition" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 transition" />
                      Copy
                    </>
                  )}
                </button>
                <span className="" data-state="closed">
                  <button
                    className="flex items-center gap-1 py-1 select-none cursor-pointer"
                    disabled={!hasFetched}
                    onClick={handleClear}
                  >
                    {cleared ? (
                      <>
                        <Trash2 className="w-4 h-4 transition text-red-500" />
                        Cleared
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 transition" />
                        Clear
                      </>
                    )}
                  </button>
                </span>
              </div>
            </div>
          </div>

          <div className="text-sm flex justify-between">
            <div>
              {roomId.length > 0 ? characterSaveMsg() : "Please Enter room id"}
            </div>
            <div>{resData.last_modified}</div>
          </div>
        </div>
      )}

      <footer className="bg-black text-white text-center text-base py-2 mt-10 fixed bottom-0 w-full">
Brought to you by a Community Engineer
      </footer>
    </>
  );
};

export default Homepage;
