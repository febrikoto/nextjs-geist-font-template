"use client";

import React, { useState } from "react";
import * as XLSX from "xlsx";

interface Participant {
  no: number;
  nis: string;
  nama: string;
  ruang: string;
  kelas: string;
  keterangan?: string;
}

export default function HomePage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [rooms, setRooms] = useState<string[]>([]);

  // Parse Excel file and extract participant data
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      if (!data) return;

      const workbook = XLSX.read(data, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      // Map jsonData to Participant[]
      const parsedParticipants: Participant[] = jsonData.map((row, index) => ({
        no: index + 1,
        nis: row["NIS"]?.toString() || "",
        nama: row["Nama Siswa"] || "",
        ruang: row["Ruang"] || "",
        kelas: row["Kelas"] || "",
        keterangan: row["Presensi"] || row["Keterangan"] || "",
      }));

      setParticipants(parsedParticipants);

      // Extract unique rooms
      const uniqueRooms = Array.from(new Set(parsedParticipants.map((p) => p.ruang))).filter(
        (r) => r !== ""
      );
      setRooms(uniqueRooms);
      if (uniqueRooms.length > 0) setSelectedRoom(uniqueRooms[0]);
    };
    reader.readAsBinaryString(file);
  };

  // Filter participants by selected room
  const filteredParticipants = participants.filter((p) => p.ruang === selectedRoom);

  return (
    <main className="min-h-screen bg-white text-black p-6 font-sans">
      <h1 className="text-3xl font-bold mb-6 text-center">Denah Duduk dan Data Peserta Ujian</h1>

      <section className="mb-6">
        <label htmlFor="file-upload" className="block mb-2 font-semibold">
          Import Data Peserta (Excel)
        </label>
        <input
          type="file"
          id="file-upload"
          accept=".xlsx, .xls"
          onChange={handleFileUpload}
          className="border border-gray-300 rounded p-2 w-full max-w-sm"
        />
      </section>

      {rooms.length > 0 && (
        <section className="mb-6">
          <label htmlFor="room-select" className="block mb-2 font-semibold">
            Pilih Ruang
          </label>
          <select
            id="room-select"
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            className="border border-gray-300 rounded p-2"
          >
            {rooms.map((room) => (
              <option key={room} value={room}>
                {room}
              </option>
            ))}
          </select>
        </section>
      )}

      {selectedRoom && (
        <>
          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Data Peserta Ruang {selectedRoom}</h2>
            <div className="overflow-x-auto">
              <table className="w-full border border-black border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-black px-2 py-1">No.</th>
                    <th className="border border-black px-2 py-1">NIS</th>
                    <th className="border border-black px-2 py-1">Nama Siswa</th>
                    <th className="border border-black px-2 py-1">Ruang</th>
                    <th className="border border-black px-2 py-1">Kelas</th>
                    <th className="border border-black px-2 py-1">Presensi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParticipants.map((p, idx) => (
                    <tr key={p.nis} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="border border-black px-2 py-1 text-center">{p.no}</td>
                      <td className="border border-black px-2 py-1 text-center">{p.nis}</td>
                      <td className="border border-black px-2 py-1">{p.nama}</td>
                      <td className="border border-black px-2 py-1 text-center">{p.ruang}</td>
                      <td className="border border-black px-2 py-1 text-center">{p.kelas}</td>
                      <td className="border border-black px-2 py-1">{p.keterangan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Denah Tempat Duduk Ruang {selectedRoom}</h2>
            <div className="grid grid-cols-5 gap-4 max-w-xl mx-auto">
              {filteredParticipants.slice(0, 20).map((p) => (
                <div
                  key={p.nis}
                  className="border border-black p-4 text-center bg-gray-100 rounded"
                >
                  <div className="font-bold mb-1">{p.nis}</div>
                  <div>{p.nama}</div>
                </div>
              ))}
              {filteredParticipants.length === 0 && (
                <p className="col-span-5 text-center text-gray-500">Tidak ada peserta di ruang ini.</p>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
