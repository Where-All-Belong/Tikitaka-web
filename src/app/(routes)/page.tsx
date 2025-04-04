"use client";

import { motion } from "framer-motion";
import { usePet } from "@/hooks/usePet";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const sessionId = useSession();
  const { pet } = usePet();
  const [userName, setUserName] = useState("");

  const handleStart = () => {
    if (userName.trim()) {
      router.push(`/form?userName=${encodeURIComponent(userName.trim())}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5, ease: "easeOut" }}
      className="h-full flex flex-col items-center justify-start bg-gradient-to-b from-blue-50 to-white prevent-overscroll p-4"
    >
      <main className="w-full max-w-md text-center px-6">
        <motion.img
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 1.2,
            delay: 0.5,
            ease: [0.25, 0.1, 0.25, 1],
          }}
          src="/images/bellong_tikitaka.png"
          alt="Bellong Tikitaka Image"
          className="w-24 h-24 mx-auto mb-2"
        />
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            duration: 1.2,
            delay: 1.0,
            ease: [0.25, 0.1, 0.25, 1],
          }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            티키타카
          </h1>
          <p className="text-gray-600 text-lg font-medium">
            서로를 이해하는 대화의 시작
          </p>
        </motion.div>

        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            duration: 1.2,
            delay: 2.2,
            ease: [0.25, 0.1, 0.25, 1],
          }}
          className="mb-8 space-y-2 text-gray-500 text-sm"
        >
          <p>AI 기술로 반려동물의 마음을 이해하고</p>
          <p>특별한 대화를 시작해보세요 🐾</p>
          <p className="text-xs text-gray-400/50 pt-2">
            * 현재는 대화가 10번까지만 가능해요
          </p>
        </motion.div>

        <motion.div
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            duration: 1.2,
            delay: 3.3,
            ease: [0.25, 0.1, 0.25, 1],
          }}
          className="bg-white rounded-3xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.05)]"
        >
          <div className="flex flex-col items-center">
            <label className="self-start mb-2 text-xs px-1 font-light text-gray-800">
              반려동물과의 관계를 입력해 주세요.
            </label>
            <div className="w-full flex flex-col items-center space-y-4">
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="예) 누나, 아빠, 은빈"
                className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-gray-50/50 placeholder:text-xs"
                onKeyDown={(e) => e.key === "Enter" && handleStart()}
              />
              <button
                onClick={handleStart}
                disabled={!userName.trim()}
                className={`w-full py-2.5 rounded-xl font-medium text-sm transition-all transform
                  ${
                    userName.trim()
                      ? "bg-blue-500 text-white hover:bg-blue-600/95 hover:scale-[1.01] active:scale-[0.99]"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  } shadow-sm`}
              >
                {userName.trim() ? `시작하기` : "입력하고 시작하기"}
              </button>
              {sessionId && pet && (
                <motion.button
                  onClick={() => router.push(`/chat`)}
                  className="text-xs text-blue-500"
                  animate={{
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  대화 기록이 있어요!
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      </main>
      <footer className="fixed bottom-0 w-full text-center text-sm text-gray-400 py-6">
        <a
          className="flex items-center justify-center gap-2 hover:text-gray-600 transition-colors"
          href="https://marble-border-52d.notion.site/Where-All-Belong-Belonging-03ac1be004554b1ebb7bec887c167524?pvs=4"
          target="_blank"
          rel="noopener noreferrer"
        >
          Where all belong
        </a>
      </footer>
    </motion.div>
  );
}
