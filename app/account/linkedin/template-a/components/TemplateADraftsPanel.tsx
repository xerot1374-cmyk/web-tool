"use client";

import ToolboxSection from "@/app/components/templates/linkedin-shared/ToolBox/ToolboxSection";
import type { TemplateDraftSummary } from "../lib/templateA.types";

type TemplateADraftsPanelProps = {
  activeDraftId: string | null;
  drafts: TemplateDraftSummary[] | null;
  error: string;
  loading: boolean;
  creating: boolean;
  deletingDraftId: string | null;
  switchingDraftId: string | null;
  onDuplicate: () => void;
  onNew: () => void;
  onDelete: (draft: TemplateDraftSummary) => void;
  onLoad: () => void;
  onNameChange: (draftId: string, name: string) => void;
  onRename: (draftId: string, name: string) => void;
  onSelect: (draft: TemplateDraftSummary) => void;
};

export default function TemplateADraftsPanel({
  activeDraftId,
  drafts,
  error,
  loading,
  creating,
  deletingDraftId,
  switchingDraftId,
  onDuplicate,
  onNew,
  onDelete,
  onLoad,
  onNameChange,
  onRename,
  onSelect,
}: TemplateADraftsPanelProps) {
  return (
    <ToolboxSection
      title="Drafts"
      meta="Saved"
      collapsible
      onOpen={onLoad}
    >
      <div className="template-drafts">
        <div className="template-drafts__actions">
          <button
            type="button"
            className="tb__action template-drafts__new"
            disabled={creating}
            onClick={onNew}
          >
            {creating ? "Creating..." : "New"}
          </button>
          <button
            type="button"
            className="tb__action template-drafts__new"
            disabled={creating}
            onClick={onDuplicate}
          >
            Duplicate
          </button>
        </div>

        {loading ? (
          <div className="template-drafts__notice">Loading drafts...</div>
        ) : null}

        {error ? (
          <div className="template-drafts__notice template-drafts__notice--error">
            {error}
          </div>
        ) : null}

        {!loading && drafts?.length === 0 ? (
          <div className="template-drafts__notice">No saved drafts yet.</div>
        ) : null}

        {drafts?.length ? (
          <div className="template-drafts__list">
            {drafts.map((draft) => {
              const active = draft.id === activeDraftId;
              const switching = draft.id === switchingDraftId;
              const deleting = draft.id === deletingDraftId;

              return (
                <div
                  key={draft.id}
                  className={
                    active
                      ? "template-drafts__item template-drafts__item--active"
                      : "template-drafts__item"
                  }
                >
                  <button
                    type="button"
                    className="template-drafts__pick"
                    disabled={active || switching}
                    onClick={() => onSelect(draft)}
                    aria-label={`Open ${draft.name}`}
                  >
                    {switching ? "Opening..." : active ? "Current" : "Open"}
                  </button>
                  <input
                    className="editor-input template-drafts__name"
                    value={draft.name}
                    maxLength={100}
                    aria-label={`Rename ${draft.name}`}
                    onChange={(event) =>
                      onNameChange(draft.id, event.target.value)
                    }
                    onBlur={(event) => onRename(draft.id, event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.currentTarget.blur();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="template-drafts__delete"
                    disabled={deleting}
                    onClick={() => onDelete(draft)}
                    aria-label={`Delete ${draft.name}`}
                    title={`Delete ${draft.name}`}
                  >
                    <svg viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M7 3h6l.6 1.5H17v2H3v-2h3.4L7 3Zm-1.5 5h9l-.6 8.2c-.1 1-1 1.8-2 1.8H8.1c-1 0-1.9-.8-2-1.8L5.5 8Zm3 2v5h1.5v-5H8.5Zm3 0v5H13v-5h-1.5Z" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </ToolboxSection>
  );
}
