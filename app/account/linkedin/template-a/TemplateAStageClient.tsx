"use client";

import LinkedInRichPostRenderer, {
  type LinkedInRichPostRendererProps,
} from "../../../components/templates/linkedin/LinkedInRichPostRenderer";

export default function TemplateAStageClient(
  props: LinkedInRichPostRendererProps,
) {
  return (
    <div className="li2-stage">
      <div className="li2-template">
        <LinkedInRichPostRenderer {...props} />
      </div>

      <div className="li2-overlay">
        {/* Edit UI */}
        <div className="li2-edit-control">
          {/* For example, an input or drag handle */}
        </div>
      </div>
    </div>
  );
}
