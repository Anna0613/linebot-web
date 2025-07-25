import React from "react";

const renderContent = (component, index) => {
  if (!component || !component.type) return null;

  switch (component.type) {
    case "image": {
      // aspectMode, aspectRatio, gravity, size
      let objectFit: string = "cover";
      if (component.aspectMode === "fit") objectFit = "contain";
      let aspectRatioStyle: Record<string, any> = {};
      if (component.aspectRatio) {
        const [w, h] = component.aspectRatio.split(":").map(Number);
        if (w && h) {
          aspectRatioStyle = {
            aspectRatio: `${w} / ${h}`,
            width: "100%",
            height: "auto",
          };
        } else if (component.aspectRatio.match(/^\d+$/)) {
          aspectRatioStyle = {
            aspectRatio: component.aspectRatio,
            width: "100%",
            height: "auto",
          };
        }
      }
      let gravityStyle: Record<string, any> = {};
      if (component.gravity === "center") gravityStyle = { objectPosition: "center" };
      if (component.gravity === "top") gravityStyle = { objectPosition: "top" };
      if (component.gravity === "bottom") gravityStyle = { objectPosition: "bottom" };
      let sizeStyle: Record<string, any> = {};
      if (component.size === "full") sizeStyle = { width: "100%", height: "100%" };
      return (
        <img
          key={index}
          src={component.url}
          alt={component.alt || "image"}
          className="w-full max-w-full object-cover rounded-md mb-2"
          style={{
            objectFit: objectFit,
            ...aspectRatioStyle,
            ...gravityStyle,
            ...sizeStyle,
          } as React.CSSProperties}
        />
      );
    }
    case "text": {
      // wrap, weight, size, align, gravity, maxLines, margin
      let style: Record<string, any> = {
        color: component.color || undefined,
        textDecoration: component.decoration || undefined,
        textAlign: component.align || undefined,
        margin: component.margin || undefined,
        fontWeight: component.weight || undefined,
        fontSize: component.size ? (component.size === "xl" ? "1.25rem" : component.size === "lg" ? "1.125rem" : component.size === "md" ? "1rem" : component.size === "sm" ? "0.875rem" : component.size === "xs" ? "0.75rem" : undefined) : undefined,
        lineHeight: component.wrap ? "1.5" : undefined,
        whiteSpace: component.wrap ? "normal" : "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        maxWidth: "100%",
        display: "-webkit-box",
        WebkitLineClamp: component.maxLines || undefined,
        WebkitBoxOrient: component.maxLines ? "vertical" : undefined,
      };
      return (
        <p
          key={index}
          className="truncate"
          style={style}
        >
          {component.text}
        </p>
      );
    }
    case "icon": {
      // 支援 size, margin
      let style: Record<string, any> = {
        margin: component.margin || undefined,
        width: component.size || 20,
        height: component.size || 20,
        marginRight: "2px",
      };
      return (
        <img
          key={index}
          src={component.url}
          alt="icon"
          className="inline-block"
          style={style}
        />
      );
    }
    case "box": {
      // 支援 position, background, offset, width, height, padding, margin, border, cornerRadius, backgroundColor, spacing
      let layoutClass = "flex flex-col";
      if (component.layout === "horizontal") layoutClass = "flex flex-row";
      if (component.layout === "baseline") layoutClass = "flex items-baseline";
      let style: Record<string, any> = {};
      if (component.justifyContent) style.justifyContent = component.justifyContent;
      if (component.alignItems) style.alignItems = component.alignItems;
      if (component.paddingAll) style.padding = component.paddingAll;
      if (component.paddingTop) style.paddingTop = component.paddingTop;
      if (component.paddingBottom) style.paddingBottom = component.paddingBottom;
      if (component.paddingStart) style.paddingLeft = component.paddingStart;
      if (component.paddingEnd) style.paddingRight = component.paddingEnd;
      if (component.margin) style.margin = component.margin;
      if (component.position) style.position = component.position;
      if (component.offsetBottom) style.bottom = component.offsetBottom;
      if (component.offsetStart) style.left = component.offsetStart;
      if (component.offsetEnd) style.right = component.offsetEnd;
      if (component.width) style.width = component.width;
      if (component.height) style.height = component.height;
      if (component.background && component.background.type === "linearGradient") {
        style.background = `linear-gradient(${component.background.angle || "0deg"}, ${component.background.startColor}, ${component.background.endColor})`;
      }
      if (component.backgroundColor) style.backgroundColor = component.backgroundColor;
      if (component.borderColor) style.borderColor = component.borderColor;
      if (component.borderWidth) style.borderWidth = component.borderWidth;
      if (component.cornerRadius) style.borderRadius = component.cornerRadius;
      if (component.spacing) style.gap = component.spacing;

      // 處理細線box（如 width/height = "2px"）
      const isLine =
        (component.width === "2px" && (!component.height || component.height === "100%")) ||
        (component.height === "2px" && (!component.width || component.width === "100%"));
      if (isLine) {
        layoutClass = "";
        style.display = "block";
        if (component.width === "2px") {
          style.minWidth = "2px";
          style.width = "2px";
          style.height = component.height || "100%";
        }
        if (component.height === "2px") {
          style.minHeight = "2px";
          style.height = "2px";
          style.width = component.width || "100%";
        }
      }

      return (
        <div
          key={index}
          className={layoutClass}
          style={style}
        >
          {(component.contents || []).map((child, i) => renderContent(child, `${index}-${i}`))}
        </div>
      );
    }
    case "button": {
      // 支援 style, color, margin, height
      let style: Record<string, any> = {
        flex: component.flex !== undefined ? component.flex : undefined,
        alignSelf: component.align || undefined,
        margin: component.margin || undefined,
        height: component.height || undefined,
        color: component.color || undefined,
        backgroundColor: component.style === "primary" ? "#82C29B" : component.style === "secondary" ? "#f5f5f5" : undefined,
      };
      return (
        <button
          key={index}
          className="px-3 py-1 rounded text-sm"
          onClick={() => {
            if (component.action && component.action.uri) {
              window.open(component.action.uri, "_blank");
            }
          }}
          style={style}
        >
          {component.action?.label || "按鈕"}
        </button>
      );
    }
    case "separator": {
      // 支援 margin, color
      let style: Record<string, any> = {
        width: "100%",
        height: 1,
        backgroundColor: component.color || "#e0e0e0",
        margin: component.margin || "8px 0",
      };
      return <div key={index} style={style}></div>;
    }
    case "spacer": {
      // 支援 size
      let height = "8px";
      if (component.size === "xs") height = "4px";
      if (component.size === "sm") height = "8px";
      if (component.size === "md") height = "16px";
      if (component.size === "lg") height = "24px";
      if (component.size === "xl") height = "40px";
      return <div key={index} style={{ height }}></div>;
    }
    case "filler": {
      // 空白填充
      return <div key={index} style={{ flex: 1 }}></div>;
    }
    default:
      return null;
  }
};

const FlexMessagePreview = ({ json }) => {
  if (!json || !json.contents || json.type !== "flex") {
    return <p className="text-red-500">Flex Message 格式錯誤</p>;
  }

  const contents = json.contents;

  // 根據 bubble 內容動態產生 style
  const getBubbleStyle = (bubble: any): React.CSSProperties => {
    return {
      width: 360,
      height: "auto",
      maxWidth: "100%",
      maxHeight: "none",
      background: bubble.backgroundColor || "#fff",
      borderRadius: bubble.cornerRadius || 20,
      borderColor: bubble.borderColor || undefined,
      borderWidth: bubble.borderWidth || undefined,
      borderStyle: bubble.borderWidth ? "solid" : undefined,
      overflow: "hidden",
      boxShadow: bubble.shadow === false ? undefined : "0 2px 8px #0001",
      position: "relative",
      display: "flex",
      flexDirection: "column",
      margin: "0 auto",
    };
  };

  // bubble區塊渲染
  const renderBubble = (bubble: any, key?: React.Key) => (
    <div key={key} style={getBubbleStyle(bubble)}>
      {/* header */}
      {bubble.header && (
        <div style={{ flex: bubble.header.flex ?? undefined }}>
          {renderContent(bubble.header, "header")}
        </div>
      )}
      {/* hero */}
      {bubble.hero && bubble.hero.type === "image" && (
        <div style={{ width: "100%", flex: bubble.hero.flex ?? undefined }}>
          {renderContent(bubble.hero, "hero")}
        </div>
      )}
      {/* body */}
      {bubble.body && (
        <div style={{ flex: bubble.body.flex ?? 1 }}>
          {renderContent(bubble.body, "body")}
        </div>
      )}
      {/* footer */}
      {bubble.footer && (
        <div style={{ flex: bubble.footer.flex ?? undefined }}>
          {renderContent(bubble.footer, "footer")}
        </div>
      )}
    </div>
  );

  return (
    <div
      className="w-full h-full p-2 bg-white rounded relative flex items-center justify-center"
      style={{ maxHeight: 600, maxWidth: "100%", overflow: "auto" }}
    >
      {contents.type === "carousel"
        ? (
          <div style={{ display: "flex", gap: 16, overflowX: "auto", width: "100%" }}>
            {contents.contents.map((bubble, i) => renderBubble(bubble, i))}
          </div>
        )
        : contents.type === "bubble"
        ? renderBubble(contents)
        : null}
    </div>
  );
};

export default FlexMessagePreview;
