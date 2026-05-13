import { useState, useEffect } from "react";

interface DashboardKPIs {
  totalEntities: number;
  verifiedEntities: number;
  activeVillages: number;
}

interface DashboardResponse {
  ok: boolean;
  data?: {
    kpis: DashboardKPIs;
    charts: {
      byObjectType: Array<{ key: string; label: string; total: number }>;
      byRegion: Array<{ key: string; label: string; total: number }>;
      byVerificationStatus: Array<{ key: string; label: string; total: number }>;
    };
  };
  error?: { code: string; message: string };
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/_emdash/api/plugins/sikesra/dashboard", {
      headers: { "X-EmDash-Request": "1" },
    })
      .then((res) => res.json())
      .then((result: DashboardResponse) => {
        if (result.ok) {
          setData(result.data ?? null);
        } else {
          setError(result.error?.message ?? "Failed to load dashboard");
        }
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-6">Memuat dashboard...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;
  if (!data) return <div className="p-6">Tidak ada data dashboard.</div>;

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Ikhtisar SIKESRA</h1>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded">
          <div className="text-2xl font-bold text-blue-700">{data.kpis.totalEntities}</div>
          <div className="text-sm text-blue-600">Total Entitas</div>
        </div>
        <div className="bg-green-50 p-4 rounded">
          <div className="text-2xl font-bold text-green-700">{data.kpis.verifiedEntities}</div>
          <div className="text-sm text-green-600">Terverifikasi</div>
        </div>
        <div className="bg-purple-50 p-4 rounded">
          <div className="text-2xl font-bold text-purple-700">{data.kpis.activeVillages}</div>
          <div className="text-sm text-purple-600">Desa Aktif</div>
        </div>
      </div>
    </div>
  );
}
