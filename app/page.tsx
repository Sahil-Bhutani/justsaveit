'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const Homepage = () => {
  const [roomId, setRoomId] = useState<string>('');
  const [resData, setResData] = useState<{ content?: string; last_modified?: string }>({ content: '' });
  const [roomContent, setRoomContent] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [saveMsg, setSaveMsg] = useState<string>('saved.');
  const [isRoomIdChanged, setRoomIdChanged] = useState(true);
  const [hasFetched, setHasFetched] = useState(false); // New state

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const roomIdRef = useRef<HTMLInputElement>(null);

  const now = useCallback(() => {
    const tzoffset = new Date().getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzoffset).toISOString().slice(0, 19).replace('T', ' ');
  }, []);

  const getDateFormat = useCallback((dateStr: string) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    };
    return `Last Modified - ${new Date(dateStr).toLocaleString('en-US', options)}`;
  }, []);

  const characterSaveMsg = useCallback(() => {
    return roomContent.length === 0
      ? `No character ${saveMsg}`
      : `${roomContent.length} character ${saveMsg}`;
  }, [roomContent, saveMsg]);

  const focusRoomContent = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      textareaRef.current?.focus();
    }
  };

  const handleRoomId = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newId = e.target.value.trim();
    setRoomId(newId);
    setRoomContent(''); // Clear previous content
    setResData({ content: '', last_modified: '' }); // Reset data
    setRoomIdChanged(true);
    setSaveMsg('');
    setHasFetched(false);
  }, []);

  const handleRoomContent = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRoomContent(e.target.value);
    if (roomId.length > 0) setSaveMsg('saving....');
  }, [roomId]);

  const fetchRoomData = useCallback(async (id: string) => {
    try {
      const res = await fetch('/api/createroom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: id }),
      });

      const data = await res.json();

      if (data.status === 'success' || data.status === 'already') {
        setResData({
          ...data.data,
          last_modified: getDateFormat(data.data.last_modified),
        });

        if (data.status === 'already') {
          setRoomContent(data.data.content);
        }

        setSaveMsg('saved.');
        setRoomIdChanged(false);
        setHasFetched(true); // Mark fetch done
        localStorage.setItem('localRoomId', id);
      } else {
        setError('Failed to create or retrieve room.');
      }
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again later.');
    }
  }, [getDateFormat]);

  const handleRoomBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const { value } = e.target;
    if (value.length > 0 && isRoomIdChanged) {
      fetchRoomData(value);
    }
  }, [isRoomIdChanged, fetchRoomData]);

  useEffect(() => {
    const id = localStorage.getItem('localRoomId');
    if (id) {
      setRoomId(id);
      fetchRoomData(id);
    }
  }, [fetchRoomData]);

  useEffect(() => {
    let timeOutId: ReturnType<typeof setTimeout>;

    if (roomId.length > 0 && hasFetched && (resData.content ?? '') !== roomContent) {
      timeOutId = setTimeout(() => {
        fetch('/api/updateroom', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            room_id: roomId,
            content: roomContent,
            last_modified: now(),
          }),
        })
          .then((res) => res.json())
          .then(() => {
            setSaveMsg('saved.');
            setResData((prev) => ({
              ...prev,
              last_modified: getDateFormat(now()),
            }));
          });
      }, 1000);
    }

    return () => clearTimeout(timeOutId);
  }, [roomContent, roomId, resData.content, now, getDateFormat, hasFetched]);

  return (
    <>
      <nav className="bg-black text-white text-center p-4 font-bold text-lg sticky top-0 z-50">
        Save your text online
      </nav>

      {error ? (
        <div className="h-[90vh] flex flex-col items-center justify-center text-center space-y-4">
          <img src="/error.png" alt="Error" className="w-[300px]" />
          <h1 className="text-2xl font-semibold">Something went wrong...</h1>
        </div>
      ) : (
        <div className="container max-w-6xl mx-auto mt-6 space-y-4">
          <Input
            type="text"
            placeholder="Enter room id"
            value={roomId}
            ref={roomIdRef}
            onKeyDown={focusRoomContent}
            onChange={handleRoomId}
            onBlur={handleRoomBlur}
            style={{ border: '1px solid lightgray' }}
          />

      <Textarea
  placeholder={hasFetched ? "Your content..." : "Please wait…"}
  value={roomContent}
  onChange={handleRoomContent}
  ref={textareaRef}
  rows={10}
  disabled={!hasFetched}
  style={{ border: '1px solid lightgray', maxHeight: '360px' }}
/>
          <div className="text-sm flex justify-between">
            <div>{roomId.length > 0 ? characterSaveMsg() : 'Please Enter room id'}</div>
            <div>{resData.last_modified}</div>
          </div>
        </div>
      )}

      <footer className="bg-black text-white text-center text-sm py-2 mt-10 fixed bottom-0 w-full">
        <a href="#" target="_blank" rel="noopener noreferrer">
          Developed by an Unknown Developer
        </a>
      </footer>
    </>
  );
};

export default Homepage;
