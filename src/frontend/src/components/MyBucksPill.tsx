import { useEffect } from "react";
import { useApp } from "../context/AppContext";
import { useMyBucksBalance } from "../hooks/useQueries";

interface MyBucksPillProps {
  compact?: boolean;
}

export default function MyBucksPill({ compact = false }: MyBucksPillProps) {
  const { setMyBucksBalance } = useApp();
  const { data: balance } = useMyBucksBalance();

  useEffect(() => {
    if (balance !== undefined) {
      setMyBucksBalance(balance);
    }
  }, [balance, setMyBucksBalance]);

  const displayBalance = balance !== undefined ? Number(balance) : 0;

  if (compact) {
    // On mobile: just the gold coin, no balance text
    return (
      <div
        data-ocid="nav.mybucks_pill"
        className="flex items-center justify-center select-none"
        title={`${displayBalance.toLocaleString()} MyBucks`}
      >
        <div className="gold-coin">My</div>
      </div>
    );
  }

  return (
    <div data-ocid="nav.mybucks_pill" className="mybucks-pill select-none">
      <div className="gold-coin">My</div>
      <span className="font-mono-custom text-sm font-semibold text-foreground/90 pr-1">
        {displayBalance.toLocaleString()}
      </span>
    </div>
  );
}
