'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const Homepage = () => {
  const [roomId, setRoomId] = useState<string>('');
  const [resData, setResData] = useState<{
    content?: string;
    last_modified?: string;
  }>({ content: '' });
  const [roomContent, setRoomContent] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [saveMsg, setSaveMsg] = useState<string>('saved.');
  const [isRoomIdChanged, setRoomIdChanged] = useState(true);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const roomIdRef = useRef<HTMLInputElement>(null);

  const now = React.useCallback(() => {
    const tzoffset = new Date().getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzoffset)
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ');
  },[]);

  const getDateFormat = React.useCallback((dateStr: string) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    };
    return `Last Modified - ${new Date(dateStr).toLocaleString(
      'en-US',
      options
    )}`;
  },[]);

  const characterSaveMsg = React.useCallback(() => {
    if (roomContent.length === 0) {
      return `No character ${saveMsg}`;
    } else {
      return `${roomContent.length} character ${saveMsg}`;
    }
  },[roomContent,saveMsg]);

  const focusRoomContent = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      textareaRef.current?.focus();
    }
  };

  const handleRoomId = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRoomId(e.target.value);
    setRoomIdChanged(true);
  },[]);

  const handleRoomContent = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRoomContent(e.target.value);
    if (roomId.length > 0) setSaveMsg('saving....');
  },[roomId]);

  const handleRoomBlur = React.useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const { value } = e.target;
    if (value.length > 0 && isRoomIdChanged) {
      const formData = new FormData();
      formData.append('room_id', value);

      fetch('/api/createroom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',  // ✅ Critical
        },
        body: JSON.stringify({ room_id: roomId }), // ✅ Must be JSON
      })
        .then((res) => res.json())
        .then((res) => {
          if (res.status === 'success') {
            setResData({ content: '' });
          } else if (res.status === 'already') {
            setResData({
              ...res.data,
              last_modified: getDateFormat(res.data.last_modified),
            });
            setRoomContent(res.data.content);
          }
          setSaveMsg('saved.');
          setRoomIdChanged(false);
          localStorage.setItem('localRoomId', roomId);
        })
        .catch((err) => {
          setError('Something went wrong. Please try again later.');
          console.error(err);
        });
    }
  },[isRoomIdChanged,roomId]);

  useEffect(() => {
    let timeOutId: ReturnType<typeof setTimeout>;

    const updateContent = (textData: string) => {
      fetch('/api/updateroom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room_id: roomId,
          content: textData,
          last_modified: now(),
        }),
      })
        .then((res) => res.json())
        .then(() => {
          setSaveMsg('saved.');
          setResData({ ...resData, last_modified: getDateFormat(now()) });
        });
    };
    
    

    if (roomId.length > 0 && resData.content !== roomContent) {
      timeOutId = setTimeout(() => {
        updateContent(roomContent);
      }, 1000);
    }

    return () => clearTimeout(timeOutId);
  }, [roomContent]);

  useEffect(() => {
    const id = localStorage.getItem('localRoomId');
    if (id && textareaRef.current) textareaRef.current.focus();
  }, []);

  useEffect(() => {
    const storedRoomId = localStorage.getItem('localRoomId');
    if (storedRoomId) {
      setRoomId(storedRoomId);
    }
  }, []);
  

  return (
    <>
      <nav className="bg-black text-white text-center p-4 font-bold text-lg sticky top-0 z-50">
        Save your text online
      </nav>

      {error ? (
        <div className="h-[90vh] flex flex-col items-center justify-center text-center space-y-4">
          <img src="/error.png" alt="error" className="w-[300px]" />
          <h1 className="text-2xl font-semibold">Something went wrong...</h1>
        </div>
      ) : (
        <div className="container max-w-2xl mx-auto mt-6 space-y-4">
          <Input
            type="text"
            placeholder="Enter room id"
            value={roomId}
            ref={roomIdRef}
            onKeyDown={focusRoomContent}
            onChange={handleRoomId}
            onBlur={handleRoomBlur}
          />

          <Textarea
            placeholder="Your content..."
            value={roomContent}
            onChange={handleRoomContent}
            ref={textareaRef}
            rows={10000}
          />

          <div className="text-sm flex justify-between">
            <div>
              {roomId.length > 0 ? characterSaveMsg() : 'Please Enter room id'}
            </div>
            <div>{resData.last_modified}</div>
          </div>
        </div>
      )}

      <footer className="bg-black text-white text-center text-sm py-2 mt-10 fixed bottom-0 w-full">
        <a
          href="#"
          target="_blank"
          rel="noopener noreferrer"
        >
          Developed by an Unknown Developer
        </a>
      </footer>
    </>
  );
};

export default Homepage;
