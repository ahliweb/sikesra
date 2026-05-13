// Permission Registry Page
// Displays SIKESRA permissions grouped by resource for role management
// Source: Issue #204

import { useState, useEffect } from "react";

interface PermissionEntry {
  id: string;
  displayName: string;
  description: string;
  resourceGroup: string;
  riskLevel: "standard" | "high";
}

interface PermissionRegistryResponse {
  ok: boolean;
  requestId: string;
  data?: {
    pluginId: string;
    totalPermissions: number;
    permissions: PermissionEntry[];
    groupedByResource: Record<string, PermissionEntry[]>;
    highRiskPermissions: PermissionEntry[];
    standardPermissions: PermissionEntry[];
    resourceGroups: string[];
  };
  error?: {
    code: string;
    message: string;
  };
}

export function PermissionRegistryPage() {
  const [registry, setRegistry] = useState<PermissionRegistryResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [filterRisk, setFilterRisk] = useState<"all" | "standard" | "high">("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/_emdash/api/plugins/sikesra/v1/permissions", {
      headers: { "X-EmDash-Request": "1" },
    })
      .then((res) => res.json())
      .then((data: PermissionRegistryResponse) => {
        if (data.ok) {
          setRegistry(data.data);
        } else {
          setError(data.error?.message ?? "Failed to load permission registry");
        }
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-6">Loading permission registry...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">Error: {error}</div>;
  }

  if (!registry) {
    return <div className="p-6">No permission registry data available.</div>;
  }

  const allGroups = ["all", ...registry.resourceGroups];
  const filteredGroups = selectedGroup === "all" ? registry.resourceGroups : [selectedGroup];

  const filterPermissions = (permissions: PermissionEntry[]) => {
    return permissions.filter((p) => {
      const matchesRisk = filterRisk === "all" || p.riskLevel === filterRisk;
      const matchesSearch = searchQuery === "" ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesRisk && matchesSearch;
    });
  };

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Permission Registry</h1>
        <p className="text-gray-600">
          SIKESRA permission catalog for role assignment. {registry.totalPermissions} permissions across {registry.resourceGroups.length} resource groups.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded">
          <div className="text-2xl font-bold text-blue-700">{registry.totalPermissions}</div>
          <div className="text-sm text-blue-600">Total Permissions</div>
        </div>
        <div className="bg-green-50 p-4 rounded">
          <div className="text-2xl font-bold text-green-700">{registry.standardPermissions.length}</div>
          <div className="text-sm text-green-600">Standard Risk</div>
        </div>
        <div className="bg-red-50 p-4 rounded">
          <div className="text-2xl font-bold text-red-700">{registry.highRiskPermissions.length}</div>
          <div className="text-sm text-red-600">High Risk</div>
        </div>
      </div>

      <div className="mb-6 flex gap-4">
        <input
          type="text"
          placeholder="Search permissions..."
          className="flex-1 px-3 py-2 border rounded"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          className="px-3 py-2 border rounded"
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
        >
          {allGroups.map((group) => (
            <option key={group} value={group}>
              {group === "all" ? "All Groups" : group.charAt(0).toUpperCase() + group.slice(1)}
            </option>
          ))}
        </select>
        <select
          className="px-3 py-2 border rounded"
          value={filterRisk}
          onChange={(e) => setFilterRisk(e.target.value as "all" | "standard" | "high")}
        >
          <option value="all">All Risk Levels</option>
          <option value="standard">Standard</option>
          <option value="high">High</option>
        </select>
      </div>

      {filteredGroups.map((group) => {
        const permissions = filterPermissions(registry.groupedByResource[group] || []);
        if (permissions.length === 0) return null;

        return (
          <div key={group} className="mb-6">
            <h2 className="text-xl font-semibold mb-3 capitalize">{group} Permissions</h2>
            <div className="border rounded overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-sm font-medium text-gray-700">Permission ID</th>
                    <th className="text-left px-4 py-2 text-sm font-medium text-gray-700">Display Name</th>
                    <th className="text-left px-4 py-2 text-sm font-medium text-gray-700">Description</th>
                    <th className="text-left px-4 py-2 text-sm font-medium text-gray-700">Risk Level</th>
                  </tr>
                </thead>
                <tbody>
                  {permissions.map((permission) => (
                    <tr key={permission.id} className="border-t">
                      <td className="px-4 py-2 font-mono text-sm">{permission.id}</td>
                      <td className="px-4 py-2">{permission.displayName}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{permission.description}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                            permission.riskLevel === "high"
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {permission.riskLevel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {filteredGroups.every((group) => (filterPermissions(registry.groupedByResource[group] || [])).length === 0) && (
        <div className="text-center py-8 text-gray-500">
          No permissions match the current filters.
        </div>
      )}
    </div>
  );
}
