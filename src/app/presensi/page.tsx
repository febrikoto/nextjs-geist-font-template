"use client";

import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Participant = {
  no: number;
  nis: string;
  nama: string;
  ruang: string;
  kelas: string;
  keterangan?: string;
  hadir: boolean;
};

export default function PresensiPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>("");

  const rooms = useMemo<string[]>(() => {
    return Array.from(new Set(participants.map((p: Participant) => p.ruang))).filter((r) => r !== "");
  }, [participants]);

  const filteredParticipants = useMemo<Participant[]>(() => {
    if (!selectedRoom) return participants;
    return participants.filter((p: Participant) => p.ruang === selectedRoom);
  }, [participants, selectedRoom]);

  const hadirCount = useMemo<number>(() => filteredParticipants.filter((p: Participant) => p.hadir).length, [filteredParticipants]);
  const totalCount = filteredParticipants.length;
  const absentCount = totalCount - hadirCount;

  function parseBooleanLike(value: unknown): boolean {
    if (typeof value === "boolean") return value;
    const normalized = String(value ?? "").trim().toLowerCase();
    return ["hadir", "ya", "yes", "true", "1", "y"].includes(normalized);
  }

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
      const jsonData: Array<Record<string, unknown>> = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      const parsed: Participant[] = jsonData.map((row, index) => ({
        no: index + 1,
        nis: (row["NIS"] as string | number | undefined)?.toString() || "",
        nama: (row["Nama Siswa"] as string | undefined) || (row["Nama"] as string | undefined) || "",
        ruang: (row["Ruang"] as string | undefined) || "",
        kelas: (row["Kelas"] as string | undefined) || "",
        keterangan: (row["Keterangan"] as string | undefined) || (row["Ket"] as string | undefined) || "",
        hadir: parseBooleanLike(row["Hadir"]),
      }));

      setParticipants(parsed);
      if (parsed.length > 0) {
        const firstRoom = parsed.find((p) => p.ruang !== "")?.ruang ?? "";
        setSelectedRoom(firstRoom);
      }
    };
    reader.readAsBinaryString(file);
  };

  function toggleAttendance(nis: string, hadir: boolean) {
    setParticipants((prev: Participant[]) =>
      prev.map((p: Participant) => (p.nis === nis ? { ...p, hadir } : p))
    );
  }

  function setAllAttendance(value: boolean) {
    setParticipants((prev: Participant[]) =>
      prev.map((p: Participant) =>
        selectedRoom && p.ruang !== selectedRoom ? p : { ...p, hadir: value }
      )
    );
  }

  function clearData() {
    setParticipants([]);
    setSelectedRoom("");
  }

  return (
    <main className="min-h-screen bg-white text-black p-6 font-sans">
      <h1 className="text-3xl font-bold mb-6 text-center">Presensi Peserta</h1>

      <section className="mb-6 flex flex-col gap-3">
        <div>
          <label htmlFor="file-upload" className="block mb-2 font-semibold">
            Import Data (Excel)
          </label>
          <input
            type="file"
            id="file-upload"
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
            className="border border-gray-300 rounded p-2 w-full max-w-sm"
          />
        </div>

        {rooms.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Ruang:</span>
              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                <SelectTrigger className="min-w-40">
                  <SelectValue placeholder="Pilih ruang" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((room) => (
                    <SelectItem key={room} value={room}>
                      {room}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" onClick={() => setAllAttendance(false)}>Tandai Semua Tidak Hadir</Button>
              <Button onClick={() => setAllAttendance(true)}>Tandai Semua Hadir</Button>
              <Button variant="ghost" onClick={clearData}>Bersihkan</Button>
            </div>
          </div>
        )}
      </section>

      {filteredParticipants.length > 0 && (
        <section className="mb-4 flex flex-wrap items-center gap-4">
          <div className="font-medium">Total: {totalCount}</div>
          <div className="text-green-700 font-medium">Hadir: {hadirCount}</div>
          <div className="text-red-700 font-medium">Tidak Hadir: {absentCount}</div>
        </section>
      )}

      {filteredParticipants.length > 0 && (
        <section className="mb-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No.</TableHead>
                <TableHead>NIS</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Ruang</TableHead>
                <TableHead>Kelas</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead>Hadir</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParticipants.map((p) => (
                <TableRow key={p.nis}>
                  <TableCell className="text-center">{p.no}</TableCell>
                  <TableCell className="text-center">{p.nis}</TableCell>
                  <TableCell>{p.nama}</TableCell>
                  <TableCell className="text-center">{p.ruang}</TableCell>
                  <TableCell className="text-center">{p.kelas}</TableCell>
                  <TableCell>{p.keterangan}</TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={p.hadir}
                      onCheckedChange={(v) => toggleAttendance(p.nis, Boolean(v))}
                      aria-label={`Hadir - ${p.nama}`}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}

      {participants.length === 0 && (
        <p className="text-center text-gray-500">Unggah file Excel untuk menampilkan presensi.</p>
      )}
    </main>
  );
}

