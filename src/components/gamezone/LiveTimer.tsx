"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface LiveTimerProps {
  endTime: Date;
}

export default function LiveTimer({ endTime }: LiveTimerProps) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpiring, setIsExpiring] = useState(false);

  const endTimeMs = endTime.getTime();

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = endTimeMs - now.getTime();

      if (difference <= 0) {
        setTimeLeft("00:00:00");
        setIsExpiring(true);
        return;
      }

      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      if (hours === 0 && minutes < 10) {
        setIsExpiring(true);
      } else {
        setIsExpiring(false);
      }

      setTimeLeft(
        `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [endTimeMs]);

  return (
    <motion.div
      animate={{ opacity: isExpiring ? [1, 0.4, 1] : 1 }}
      transition={{ duration: 0.8, repeat: isExpiring ? Infinity : 0 }}
      className={`text-2xl font-mono font-black tracking-widest ${
        isExpiring ? "text-pink-500 text-neon-pink" : "text-white"
      }`}
    >
      {timeLeft}
    </motion.div>
  );
}
