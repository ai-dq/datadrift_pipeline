export function LabelStatus({
  sample,
}: {
  sample: {
    human_verified?: boolean;
    label_state?: "unlabeled" | "labeled";
    ai_labeled?: boolean;
  };
}) {
  return (
    <span className="label-status">
      {sample.human_verified ? (
        <span>검토 완료</span>
      ) : sample.label_state === "unlabeled" ? (
        <span>레이블링 대기</span>
      ) : (
        <>
          {sample.ai_labeled && <span>자동 레이블링 완료</span>}
          <span>검토 대기</span>
        </>
      )}
    </span>
  );
}
