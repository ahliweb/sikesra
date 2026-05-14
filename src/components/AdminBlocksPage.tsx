import { useEffect, useState } from "react";

type Block = Record<string, unknown>;

interface AdminBlocksPageProps {
  page: string;
}

interface AdminBlocksResponse {
  data?: {
    blocks?: Block[];
    data?: {
      blocks?: Block[];
    };
  };
  error?: {
    code?: string;
    message?: string;
  };
}

interface AdminInteraction {
  type?: string;
  page?: string;
  action_id?: string;
  block_id?: string;
  values?: Record<string, unknown>;
}

interface FormDefinition {
  fields?: Array<Record<string, unknown>>;
  submit?: {
    label?: string;
    action_id?: string;
  };
}

interface ActionElement {
  type?: string;
  label?: string;
  action_id?: string;
  style?: string;
}

const ACTION_BUTTON_CLASS: Record<string, string> = {
  primary: "bg-blue-600 text-white border-blue-600 hover:bg-blue-700",
  secondary: "bg-white text-gray-900 border-gray-300 hover:bg-gray-50",
  danger: "bg-red-600 text-white border-red-600 hover:bg-red-700",
};

const BANNER_CLASS: Record<string, string> = {
  default: "border-gray-200 bg-gray-50 text-gray-900",
  success: "border-green-200 bg-green-50 text-green-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  alert: "border-red-200 bg-red-50 text-red-900",
};

export const ADMIN_BLOCK_PAGE_ROUTES: Record<string, string> = {
  "/": "overview",
  "/entities": "entities",
  "/entities/new": "entities/new",
  "/verification": "verification",
  "/imports": "imports",
  "/documents": "documents",
  "/reports": "reports",
  "/regions": "regions",
  "/access": "access",
  "/audit": "audit",
  "/settings": "settings",
};

export function parseAdminBlocksResponse(response: unknown): Block[] {
  if (!response || typeof response !== "object") {
    throw new Error("Invalid admin response");
  }

  const typedResponse = response as AdminBlocksResponse;
  if (typedResponse.error?.message) {
    throw new Error(typedResponse.error.message);
  }

  const blocks = typedResponse.data?.blocks ?? typedResponse.data?.data?.blocks;
  if (!Array.isArray(blocks)) {
    throw new Error("Admin response missing data.blocks");
  }

  return blocks;
}

export function resolveAdminInteractionPage(currentPage: string, input: AdminInteraction): string {
  if (input.type === "block_action" && input.action_id?.startsWith("nav_")) {
    return input.action_id.slice(4) || "overview";
  }

  const normalizedPage = (input.page || "").replace(/^\//, "");
  if (
    normalizedPage.startsWith("reports/")
    || normalizedPage.startsWith("audit/")
    || normalizedPage.startsWith("documents/")
    || normalizedPage.startsWith("imports/")
    || normalizedPage.startsWith("verification/")
    || (normalizedPage.startsWith("entities/") && normalizedPage !== "entities/new")
  ) {
    return normalizedPage;
  }

  if (normalizedPage === "entities/new") return "entities/new";

  if (input.action_id?.startsWith("wizard_") || input.block_id?.startsWith("wizard_")) {
    return "entities/new";
  }

  const pageFromAction = [
    [/^verification_(?:open|decide)_(.+)$/, "verification/"],
    [/^imports_(?:open|save_row)_(.+)$/, "imports/"],
    [/^documents_(?:open|create|complete|refresh)_(.+)$/, "documents/"],
    [/^audit_open_(.+)$/, "audit/"],
    [/^reports_open_(.+)$/, "reports/"],
  ] as const;

  for (const [pattern, prefix] of pageFromAction) {
    const match = pattern.exec(input.action_id || "");
    if (match?.[1]) return `${prefix}${match[1]}`;
  }

  if (input.action_id === "verification_back_to_queue") return "verification";
  if (input.action_id === "imports_back_to_list") return "imports";
  if (input.action_id === "documents_back_to_list") return "documents";
  if (input.action_id === "audit_back_to_list") return "audit";
  if (input.action_id === "reports_back_to_list") return "reports";

  if (input.block_id?.startsWith("entities_") || input.action_id?.startsWith("entities_")) {
    return "entities";
  }

  return normalizedPage || currentPage || "overview";
}

function parseJsonResponse(text: string): unknown {
  if (!text.trim()) {
    throw new Error("Empty admin response");
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("Admin route returned a non-JSON response");
  }
}

function parseAdminErrorResponse(status: number, payload: unknown): never {
  if (payload && typeof payload === "object") {
    const error = (payload as AdminBlocksResponse).error;
    if (error?.message) {
      throw new Error(error.message);
    }
  }

  if (status === 401) throw new Error("Authentication required");
  if (status === 403) throw new Error("Admin access denied");
  throw new Error(`Admin route request failed (${status})`);
}

function blockText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function ActionButton({ element, onAction, disabled }: { element: ActionElement; onAction: (actionId: string) => void; disabled: boolean }) {
  const style = ACTION_BUTTON_CLASS[element.style || "secondary"] || ACTION_BUTTON_CLASS.secondary;
  return (
    <button
      type="button"
      disabled={disabled || !element.action_id}
      className={`rounded border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 ${style}`}
      onClick={() => element.action_id && onAction(element.action_id)}
    >
      {element.label || "Action"}
    </button>
  );
}

function TabBlock({ block, renderBlocks }: { block: Block; renderBlocks: (blocks: Block[]) => React.ReactNode }) {
  const panels = Array.isArray(block.panels) ? (block.panels as Block[]) : [];
  const [activeTab, setActiveTab] = useState(Number(block.default_tab ?? 0));

  if (panels.length === 0) return null;

  const currentPanel = panels[Math.max(0, Math.min(activeTab, panels.length - 1))] as Record<string, unknown>;
  const panelBlocks = Array.isArray(currentPanel.blocks) ? (currentPanel.blocks as Block[]) : [];

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        {panels.map((panel, index) => (
          <button
            key={`${blockText(panel.title)}-${index}`}
            type="button"
            className={`rounded px-3 py-2 text-sm font-medium ${index === activeTab ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"}`}
            onClick={() => setActiveTab(index)}
          >
            {blockText(panel.title) || `Tab ${index + 1}`}
          </button>
        ))}
      </div>
      {renderBlocks(panelBlocks)}
    </div>
  );
}

function FormBlock({ block, onSubmit, onAction, disabled }: { block: FormDefinition; onSubmit: (actionId: string, values: Record<string, unknown>) => void; onAction: (actionId: string) => void; disabled: boolean }) {
  const initialState = Object.fromEntries(
    (block.fields || []).map((field) => {
      const key = blockText(field.action_id);
      if (field.type === "checkbox") return [key, Boolean(field.initial_value)];
      return [key, field.initial_value ?? ""];
    }),
  );

  const [values, setValues] = useState<Record<string, unknown>>(initialState);

  return (
    <form
      className="space-y-4 rounded-lg border border-gray-200 bg-white p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (block.submit?.action_id) onSubmit(block.submit.action_id, values);
      }}
    >
      {(block.fields || []).map((field, index) => {
        const actionId = blockText(field.action_id);
        const label = blockText(field.label);
        const fieldType = blockText(field.type);
        const value = values[actionId];

        if (fieldType === "hidden") return null;

        if (fieldType === "checkbox") {
          return (
            <label key={`${actionId}-${index}`} className="flex items-center gap-2 text-sm text-gray-800">
              <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={(event) => setValues((current) => ({ ...current, [actionId]: event.target.checked }))}
              />
              <span>{label}</span>
            </label>
          );
        }

        if (fieldType === "select") {
          const options = Array.isArray(field.options) ? (field.options as Array<Record<string, unknown>>) : [];
          return (
            <label key={`${actionId}-${index}`} className="block space-y-1">
              <span className="text-sm font-medium text-gray-800">{label}</span>
              <select
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                value={blockText(value)}
                onChange={(event) => setValues((current) => ({ ...current, [actionId]: event.target.value }))}
              >
                {options.map((option, optionIndex) => (
                  <option key={`${blockText(option.value)}-${optionIndex}`} value={blockText(option.value)}>
                    {blockText(option.label)}
                  </option>
                ))}
              </select>
            </label>
          );
        }

        const commonProps = {
          className: "w-full rounded border border-gray-300 px-3 py-2 text-sm",
          value: typeof value === "string" || typeof value === "number" ? value : "",
          onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            setValues((current) => ({
              ...current,
              [actionId]: fieldType === "number_input" ? event.target.value : event.target.value,
            }));
          },
          placeholder: blockText(field.placeholder),
        };

        return (
          <label key={`${actionId}-${index}`} className="block space-y-1">
            <span className="text-sm font-medium text-gray-800">{label}</span>
            {fieldType === "textarea" || field.multiline ? (
              <textarea {...commonProps} rows={4} />
            ) : (
              <input {...commonProps} type={fieldType === "number_input" ? "number" : "text"} />
            )}
          </label>
        );
      })}

      <div className="flex flex-wrap gap-2">
        {block.submit?.action_id ? (
          <button
            type="submit"
            disabled={disabled}
            className="rounded border border-blue-600 bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {block.submit.label || "Simpan"}
          </button>
        ) : null}
        {Array.isArray((block as Record<string, unknown>).actions)
          ? ((block as Record<string, unknown>).actions as ActionElement[]).map((element, index) => (
            <ActionButton key={`${element.action_id || element.label}-${index}`} element={element} onAction={onAction} disabled={disabled} />
          ))
          : null}
      </div>
    </form>
  );
}

export function AdminBlocksPage({ page }: AdminBlocksPageProps) {
  const [currentPage, setCurrentPage] = useState(page);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadBlocks(input: AdminInteraction) {
    const nextPage = resolveAdminInteractionPage(currentPage, input);
    const isInitialLoad = !input.action_id && !input.values;
    if (isInitialLoad) {
      setLoading(true);
    } else {
      setSubmitting(true);
    }
    setError(null);

    try {
      const response = await fetch("/_emdash/api/plugins/sikesra/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-EmDash-Request": "1",
        },
        body: JSON.stringify({ ...input, page: nextPage }),
      });

      const text = await response.text();
      const json = parseJsonResponse(text);

      if (!response.ok) {
        parseAdminErrorResponse(response.status, json);
      }

      setBlocks(parseAdminBlocksResponse(json));
      setCurrentPage(nextPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin page");
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  }

  useEffect(() => {
    setCurrentPage(page);
    void loadBlocks({ page });
  }, [page]);

  function renderBlocks(nextBlocks: Block[]): React.ReactNode {
    return nextBlocks.map((block, index) => {
      const type = blockText(block.type);

      if (type === "header") {
        return <h2 key={index} className="text-2xl font-semibold text-gray-900">{blockText(block.text)}</h2>;
      }

      if (type === "context") {
        return <p key={index} className="text-sm text-gray-600">{blockText(block.text)}</p>;
      }

      if (type === "divider") {
        return <hr key={index} className="border-gray-200" />;
      }

      if (type === "empty") {
        return (
          <div key={index} className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
            <h3 className="text-lg font-medium text-gray-900">{blockText(block.title)}</h3>
            <p className="mt-2 text-sm text-gray-600">{blockText(block.description)}</p>
          </div>
        );
      }

      if (type === "banner") {
        const variant = blockText(block.variant) || "default";
        return (
          <div key={index} className={`rounded-lg border p-4 ${BANNER_CLASS[variant] || BANNER_CLASS.default}`}>
            <h3 className="font-semibold">{blockText(block.title)}</h3>
            {block.description ? <p className="mt-1 text-sm">{blockText(block.description)}</p> : null}
          </div>
        );
      }

      if (type === "section") {
        const accessory = (block.accessory || null) as ActionElement | null;
        return (
          <div key={index} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4">
            <p className="whitespace-pre-wrap text-sm text-gray-800">{blockText(block.text)}</p>
            {accessory?.type === "button" ? <ActionButton element={accessory} onAction={(actionId) => void loadBlocks({ type: "block_action", page: currentPage, action_id: actionId })} disabled={submitting} /> : null}
          </div>
        );
      }

      if (type === "fields") {
        const fields = Array.isArray(block.fields) ? (block.fields as Array<Record<string, unknown>>) : [];
        return (
          <div key={index} className="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 md:grid-cols-2">
            {fields.map((field, fieldIndex) => (
              <div key={`${blockText(field.label)}-${fieldIndex}`} className="rounded border border-gray-100 bg-gray-50 p-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{blockText(field.label)}</div>
                <div className="mt-1 text-sm text-gray-900">{blockText(field.value)}</div>
              </div>
            ))}
          </div>
        );
      }

      if (type === "stats") {
        const items = Array.isArray(block.items) ? (block.items as Array<Record<string, unknown>>) : [];
        return (
          <div key={index} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {items.map((item, itemIndex) => (
              <div key={`${blockText(item.label)}-${itemIndex}`} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="text-sm text-gray-600">{blockText(item.label)}</div>
                <div className="mt-2 text-2xl font-semibold text-gray-900">{blockText(item.value)}</div>
                {item.hint ? <div className="mt-1 text-xs text-gray-500">{blockText(item.hint)}</div> : null}
              </div>
            ))}
          </div>
        );
      }

      if (type === "actions") {
        const elements = Array.isArray(block.elements) ? (block.elements as ActionElement[]) : [];
        return (
          <div key={index} className="flex flex-wrap gap-2">
            {elements.map((element, elementIndex) => (
              <ActionButton key={`${element.action_id || element.label}-${elementIndex}`} element={element} onAction={(actionId) => void loadBlocks({ type: "block_action", page: currentPage, action_id: actionId })} disabled={submitting} />
            ))}
          </div>
        );
      }

      if (type === "table") {
        const columns = Array.isArray(block.columns) ? (block.columns as Array<Record<string, unknown>>) : [];
        const rows = Array.isArray(block.rows) ? (block.rows as Array<Record<string, unknown>>) : [];
        return (
          <div key={index} className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((column, columnIndex) => (
                    <th key={`${blockText(column.key)}-${columnIndex}`} className="px-4 py-3 text-left font-medium text-gray-700">
                      {blockText(column.label)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rows.length > 0 ? rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {columns.map((column, columnIndex) => (
                      <td key={`${rowIndex}-${columnIndex}`} className="px-4 py-3 align-top text-gray-900">
                        {blockText(row[blockText(column.key)]) || "-"}
                      </td>
                    ))}
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={Math.max(columns.length, 1)} className="px-4 py-6 text-center text-gray-500">
                      {blockText(block.empty_text) || "No rows available."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      }

      if (type === "form") {
        return (
          <FormBlock
            key={index}
            block={block as FormDefinition}
            disabled={submitting}
            onAction={(actionId) => void loadBlocks({ type: "block_action", page: currentPage, action_id: actionId })}
            onSubmit={(actionId, values) => void loadBlocks({ type: "form_submit", page: currentPage, action_id: actionId, values })}
          />
        );
      }

      if (type === "tab") {
        return <TabBlock key={index} block={block} renderBlocks={renderBlocks} />;
      }

      if (type === "columns") {
        const columns = Array.isArray(block.columns) ? (block.columns as Block[][]) : [];
        return (
          <div key={index} className="grid gap-4 xl:grid-cols-2">
            {columns.map((column, columnIndex) => (
              <div key={columnIndex} className="space-y-4">{renderBlocks(column)}</div>
            ))}
          </div>
        );
      }

      return (
        <div key={index} className="rounded border border-dashed border-gray-300 bg-gray-50 p-3 text-sm text-gray-600">
          Unsupported block type: {type || "unknown"}
        </div>
      );
    });
  }

  if (loading) return <div className="p-6">Memuat halaman admin SIKESRA...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return <div className="space-y-4 p-6">{renderBlocks(blocks)}</div>;
}
