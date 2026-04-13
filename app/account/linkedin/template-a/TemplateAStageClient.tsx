"use client";

import LinkedInTemplate2Renderer from "../../../components/templates/linkedin/LinkedInTemplate2Renderer";

export default function TemplateAStageClient(props: any) {
  return (
    <div className="li2-stage">
      <div className="li2-template">
        <LinkedInTemplate2Renderer {...props} />
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
