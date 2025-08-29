// src/components/AutoPrintListener.js
import { useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function AutoPrintListener() {
  useEffect(() => {
    const channel = supabase
      .channel("visitor-insert")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "visitors" },
        (payload) => {
          console.log("✅ New visitor added:", payload.new);

          const id = payload.new.id;

          // วิธี 1: เด้งหน้าต่างใหม่ (ง่ายสุด แต่มี popup)
          // window.open(`/print/${id}`, "_blank");

          // วิธี 2: ใช้ iframe ซ่อน แล้วพิมพ์อัตโนมัติ
          const iframe = document.createElement("iframe");
          iframe.style.display = "none";
          iframe.src = `/print/${id}`;
          document.body.appendChild(iframe);
          iframe.onload = () => {
            iframe.contentWindow.print();
          };
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return null; // ไม่มี UI
}
