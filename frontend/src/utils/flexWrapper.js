// utils/flexWrapper.js
export const wrapFlexMessageBubble = (json) => {
  if (
    json.type === "flex" &&
    typeof json.altText === "string" &&
    typeof json.contents === "object"
  ) {
    return json; // 已經是完整 flex 結構
  }

  if (json.type === "bubble" || json.type === "carousel") {
    return {
      type: "flex",
      altText: "這是 Flex Message",
      contents: json,
    };
  }

  return null; // 不符合格式
};
