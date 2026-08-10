"use client";

import { useEffect, useState } from "react";

/** Tarayıcının çevrimiçi/çevrimdışı durumunu izler — kısa süreli bağlantı kopmalarında
 *  bekleyen kayıt/yükleme işlemlerini bağlantı geri gelince otomatik tekrar denemek için kullanılır. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));

  useEffect(() => {
    function setOn() { setOnline(true); }
    function setOff() { setOnline(false); }
    window.addEventListener("online", setOn);
    window.addEventListener("offline", setOff);
    return () => {
      window.removeEventListener("online", setOn);
      window.removeEventListener("offline", setOff);
    };
  }, []);

  return online;
}
