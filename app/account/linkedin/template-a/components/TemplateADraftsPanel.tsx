"use client";

import ToolboxSection from "@/app/components/templates/linkedin-shared/ToolBox/ToolboxSection";
import type { TemplateDraftSummary } from "../lib/templateA.types";

type TemplateADraftsPanelProps = {
  activeDraftId: string | null;
  drafts: TemplateDraftSummary[] | null;
  error: string;
  loading: boolean;
  creating: boolean;
  switchingDraftId: string | null;
  onCreate: () => void;
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
  switchingDraftId,
  onCreate,
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
        <button
          type="button"
          className="tb__action template-drafts__new"
          disabled={creating}
          onClick={onCreate}
        >
          {creating ? "Creating..." : "New draft"}
        </button>

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
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </ToolboxSection>
  );
}
