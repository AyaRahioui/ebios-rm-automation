import React, { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from './button';
import { Input } from './input';

export type DataTableColumn<T> = {
  key: string;
  header: string;
  widthClass?: string;
  render: (row: T) => React.ReactNode;
};

export type DataTableAction<T> = {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: (row: T) => void;
};

export type DataTableProps<T> = {
  title?: string;
  description?: string;
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  actions?: DataTableAction<T>[];
  getSearchText?: (row: T) => string;
  statusBadge?: (row: T) => React.ReactNode;

  /** Identifiant unique de la table pour persister les colonnes (localStorage). */
  columnsStorageKey?: string;

  /** Handler déclenché par le bouton "+". */
  onCreate?: () => void;

  pageSizeOptions?: number[];
  initialPageSize?: number;
  initialPage?: number;
  footerLeftText?: (meta: { from: number; to: number; total: number }) => string;
  onRowClick?: (row: T) => void;
};

function defaultFooterLeftText(meta: { from: number; to: number; total: number }) {
  return `Affichage de ${meta.from} à ${meta.to} sur ${meta.total}`;
}

function safeParseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function DataTable<T>({
  title,
  description,
  columns,
  rows,
  rowKey,
  actions,
  getSearchText,
  columnsStorageKey,
  onCreate,
  pageSizeOptions = [10, 20, 50],
  initialPageSize = 10,
  initialPage = 1,
  footerLeftText = defaultFooterLeftText,
  onRowClick,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [page, setPage] = useState(initialPage);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  // dropdowns
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pageSizeOpen, setPageSizeOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);

  // click-outside
  const filtersRef = useRef<HTMLDivElement | null>(null);
  const pageSizeRef = useRef<HTMLDivElement | null>(null);
  const columnsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDown = (ev: MouseEvent) => {
      const t = ev.target as Node;
      if (filtersOpen && filtersRef.current && !filtersRef.current.contains(t)) setFiltersOpen(false);
      if (pageSizeOpen && pageSizeRef.current && !pageSizeRef.current.contains(t)) setPageSizeOpen(false);
      if (columnsOpen && columnsRef.current && !columnsRef.current.contains(t)) setColumnsOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [filtersOpen, pageSizeOpen, columnsOpen]);

  // visible columns (persist)
  const storageKey = columnsStorageKey ?? 'columns-table';
  const defaultVisibleColumns = useMemo(() => {
    const obj: Record<string, boolean> = {};
    for (const c of columns) obj[c.key] = true;
    return obj;
  }, [columns]);

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const parsed = safeParseJson<Record<string, boolean>>(localStorage.getItem(storageKey));
    if (parsed) return { ...defaultVisibleColumns, ...parsed };
    return defaultVisibleColumns;
  });

  useEffect(() => {
    // when columns definition changes, merge
    setVisibleColumns((prev) => ({ ...defaultVisibleColumns, ...prev }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultVisibleColumns]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(visibleColumns));
  }, [visibleColumns, storageKey]);

  const visibleColumnList = useMemo(() => {
    return columns.filter((c) => visibleColumns[c.key] !== false);
  }, [columns, visibleColumns]);

  // filters (simple generic: role/status based on known keys)
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const filteredRows = useMemo(() => {
    let base = rows;

    if (getSearchText) {
      const s = search.trim().toLowerCase();
      if (s) base = base.filter((r) => getSearchText(r).toLowerCase().includes(s));
    }

    // minimal generic filtering for common columns
    if (roleFilter) {
      base = base.filter((r: any) => String(r.role ?? '').toLowerCase() === roleFilter.toLowerCase());
    }
    if (statusFilter) {
      base = base.filter((r: any) => String(r.status ?? '').toLowerCase() === statusFilter.toLowerCase());
    }

    return base;
  }, [rows, search, getSearchText, roleFilter, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize, roleFilter, statusFilter]);

  const total = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const paginatedRows = useMemo(() => {
    const from = (safePage - 1) * pageSize;
    return filteredRows.slice(from, from + pageSize);
  }, [filteredRows, safePage, pageSize]);

  const meta = useMemo(() => {
    if (total === 0) return { from: 0, to: 0, total };
    const from = (safePage - 1) * pageSize + 1;
    const to = Math.min(total, safePage * pageSize);
    return { from, to, total };
  }, [safePage, pageSize, total]);

  const visibleIds = useMemo(() => new Set(paginatedRows.map(rowKey)), [paginatedRows, rowKey]);
  const selectedVisibleCount = useMemo(() => {
    let c = 0;
    for (const id of visibleIds) {
      if (selected[id]) c++;
    }
    return c;
  }, [selected, visibleIds]);
  const allVisibleSelected = selectedVisibleCount > 0 && selectedVisibleCount === visibleIds.size;

  const toggleSelectAllVisible = () => {
    setSelected((prev) => {
      const next = { ...prev };
      for (const id of visibleIds) {
        next[id] = !allVisibleSelected;
      }
      return next;
    });
  };

  const toggleRow = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const availableRoles = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows as any[]) {
      if (r && r.role) set.add(String(r.role));
    }
    return Array.from(set);
  }, [rows]);

  const availableStatuses = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows as any[]) {
      if (r && r.status) set.add(String(r.status));
    }
    return Array.from(set);
  }, [rows]);

  const actionColSpan = visibleColumnList.length + 2;

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
      {(title || description) && (
        <div className="mb-4">
          {title && <h2 className="text-xl font-semibold text-foreground">{title}</h2>}
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2" ref={filtersRef}>
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                setFiltersOpen((v) => !v);
                setPageSizeOpen(false);
                setColumnsOpen(false);
              }}
            >
              <span aria-hidden>{filtersOpen ? '⏶' : '⏷'}</span>
              Filtres
            </Button>

            {filtersOpen && (
              <div className="absolute top-full left-0 mt-2 w-72 bg-background rounded-lg shadow-lg border border-border z-[60] p-4">
                <div className="text-sm font-medium mb-3">Filtres</div>

                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Rôle</div>
                    <select
                      className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                    >
                      <option value="">Tous</option>
                      {availableRoles.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Statut</div>
                    <select
                      className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="">Tous</option>
                      {availableStatuses.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRoleFilter('');
                        setStatusFilter('');
                      }}
                    >
                      Réinitialiser
                    </Button>
                    <Button type="button" size="sm" onClick={() => setFiltersOpen(false)}>
                      Appliquer
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." />
        </div>

        <div className="flex items-center gap-3">
          <div className="relative" ref={pageSizeRef}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-w-[160px] justify-between"
              onClick={() => {
                setPageSizeOpen((v) => !v);
                setFiltersOpen(false);
                setColumnsOpen(false);
              }}
            >
              <span>Afficher {pageSize} entrées</span>
              <span aria-hidden>⏷</span>
            </Button>

            {pageSizeOpen && (
              <div className="absolute right-0 top-full mt-2 bg-background rounded-lg shadow-lg border border-border z-[60] p-1">
                {pageSizeOptions.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-accent/30 ${n === pageSize ? 'bg-accent/40' : ''}`}
                    onClick={() => {
                      setPageSize(n);
                      setPageSizeOpen(false);
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
          </div>

          {actions && actions.length > 0 && (
            <div className="flex items-center gap-2" ref={columnsRef}>
              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Vue colonnes"
                  onClick={() => {
                    setColumnsOpen((v) => !v);
                    setPageSizeOpen(false);
                    setFiltersOpen(false);
                  }}
                >
                  <span aria-hidden>▦</span>
                </Button>

                {columnsOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-background rounded-lg shadow-lg border border-border z-[60] p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-medium">Colonnes</div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="text-xs text-primary hover:underline"
                          onClick={() => {
                            setVisibleColumns(() => {
                              const next: Record<string, boolean> = {};
                              for (const c of columns) next[c.key] = true;
                              return next;
                            });
                          }}
                        >
                          Tout afficher
                        </button>
                        <button
                          type="button"
                          className="text-xs text-primary hover:underline"
                          onClick={() => {
                            setVisibleColumns(() => {
                              const next: Record<string, boolean> = {};
                              for (const c of columns) next[c.key] = false;
                              return next;
                            });
                          }}
                        >
                          Tout masquer
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-72 overflow-auto pr-1">
                      {columns.map((c) => (
                        <label key={c.key} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={visibleColumns[c.key] !== false}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setVisibleColumns((prev) => ({ ...prev, [c.key]: checked }));
                            }}
                          />
                          <span className="truncate">{c.header}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Button
                type="button"
                size="icon"
                className="bg-primary text-primary-foreground"
                aria-label="Ajouter"
                onClick={() => {
                  onCreate?.();
                }}
              >
                <span aria-hidden>＋</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-separate" role="table">
          <thead>
            <tr className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <th className="px-4 py-3">
                <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} />
              </th>

              {visibleColumnList.map((c) => (
                <th key={c.key} className={`px-4 py-3 ${c.widthClass ?? ''}`}>
                  {c.header}
                </th>
              ))}

              {actions && actions.length > 0 && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>

          <tbody>
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={actionColSpan} className="px-4 py-8 text-center text-muted-foreground">
                  Aucune donnée
                </td>
              </tr>
            ) : (
              paginatedRows.map((row) => {
                const id = rowKey(row);
                const isSelected = !!selected[id];

                return (
                  <tr key={id} className="border-b border-border/70 hover:bg-accent/30">
                    <td className="px-4 py-4">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleRow(id)} />
                    </td>

                    {visibleColumnList.map((c) => (
                      <td
                        key={c.key}
                        className={`px-4 py-4 text-sm text-foreground align-top ${c.widthClass ?? ''}`}
                        onClick={() => onRowClick?.(row)}
                      >
                        {c.render(row)}
                      </td>
                    ))}

                    {actions && actions.length > 0 && (
                      <td className="px-4 py-4 text-right">
                        <div className="inline-flex items-center gap-2 justify-end">
                          {actions.map((a) => (
                            <button
                              key={a.key}
                              type="button"
                              aria-label={a.label}
                              className="text-muted-foreground hover:text-foreground"
                              onClick={() => a.onClick(row)}
                            >
                              {a.icon}
                            </button>
                          ))}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-muted-foreground">{footerLeftText(meta)}</div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Précédent
          </Button>

          {Array.from({ length: totalPages }).slice(0, 7).map((_, i) => {
            const p = i + 1;
            const active = p === safePage;
            if (p > totalPages) return null;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`h-9 w-9 rounded-md text-sm border border-border ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground hover:bg-accent/30'
                }`}
              >
                {p}
              </button>
            );
          })}

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Suivant
          </Button>
        </div>
      </div>
    </div>
  );
}


