import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

export default function VisitorPage() {
  const { id } = useParams();
  const [visitor, setVisitor] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("visitors")
        .select("*")
        .eq("id", id)
        .single();

      if (!error) setVisitor(data);
    })();
  }, [id]);

  if (!visitor) return <div>กำลังโหลด...</div>;

  const handleLogout = async () => {
    // ถ้าใช้ Supabase Auth
    // await supabase.auth.signOut();
    navigate("/"); // หรือ redirect ไปหน้า login/home
  };

  return (
    <div style={{ padding: 20, maxWidth: 400, margin: "0 auto" }}>
      <h2>รายละเอียดผู้มาติดต่อ</h2>
      <p><b>ID:</b> {String(visitor.id).padStart(5, "0")}</p>
      <p><b>ชื่อ:</b> {visitor.full_name}</p>
      {visitor.gender && <p><b>เพศ:</b> {visitor.gender}</p>}
      {visitor.company && <p><b>บริษัท:</b> {visitor.company}</p>}
      {visitor.contact_person && <p><b>ติดต่อ:</b> {visitor.contact_person}</p>}
      {visitor.vehicle_plate && <p><b>ทะเบียนรถ:</b> {visitor.vehicle_plate}</p>}
      {visitor.purpose && <p><b>ประสงค์:</b> {visitor.purpose}</p>}
      <p><b>เวลาเข้า:</b> {new Date(visitor.checkin_time).toLocaleString()}</p>
      <p><b>เวลาออก:</b> {visitor.checkout_time ? new Date(visitor.checkout_time).toLocaleString() : "-"}</p>

      {visitor.photo_url && (
        <img
          src={visitor.photo_url}
          alt="visitor"
          style={{ width: "100%", marginTop: 10, borderRadius: 8 }}
        />
      )}

      <button
        onClick={handleLogout}
        style={{ marginTop: 20, padding: "10px 20px", cursor: "pointer" }}
      >
        🔒 Logout
      </button>
    </div>
  );
}
