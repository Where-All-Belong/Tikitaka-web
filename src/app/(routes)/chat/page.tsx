"use client";

import { Suspense, useEffect, useRef, useState } from "react";

import Alert from "@/app/components/Alert";
import OpenAI from "openai";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";

const MAX_MESSAGE_COUNT = 10;

interface Message {
  id: number;
  text: string;
  sender: "bot" | "user";
}

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

function ChatBotContent() {
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const petParam = searchParams.get("pet");
  const pet = petParam ? JSON.parse(petParam) : null;
  const sessionId = pet ? pet.session_id : null;
  const ownerName = pet ? pet.owner_name : null;
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  // 메시지가 추가될 때마다 스크롤 최하단으로 이동
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop =
        messageContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // 채팅 기록 불러오기
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!sessionId || !pet) {
        setIsLoading(false);
        await supabase.from("pets").delete().eq("id", pet.id);
        router.push("/");
        return;
      }

      try {
        const { data, error } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("session_id", sessionId)
          .eq("pet_id", pet.id)
          .order("created_at", { ascending: true });

        // Supabase 데이터를 현재 앱의 Message 형식으로 변환
        const formattedMessages: Message[] =
          data?.map((msg, index) => ({
            id: index + 1,
            text: msg.content,
            sender: msg.sender as "user" | "bot",
          })) || [];

        // 채팅 기록이 없다면 초기 인사 메시지 추가
        if (formattedMessages.length === 0) {
          formattedMessages.push({
            id: 1,
            text: `안녕, 나 ${pet.name}! 이렇게 보니 신기해 ${ownerName}! 반가워!`,
            sender: "bot",
          });
          setMessageCount(0); // 초기 메시지만 있는 경우 카운트 0으로 설정
        } else {
          // 사용자 메시지 개수만 카운트 (봇 응답은 제외)
          const userMessageCount = formattedMessages.filter(
            (msg) => msg.sender === "user"
          ).length;
          setMessageCount(userMessageCount);
        }

        setMessages(formattedMessages);
        setIsLoading(false);

        if (error) throw error;
      } catch {
        alert("채팅 기록을 불러오는데 실패했어요😢 메인 페이지로 이동합니다.");
        router.push("/");
        setIsLoading(false);
      }
    };

    loadChatHistory();
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || !sessionId || !pet || isSending) return;

    // 메시지 카운트 증가
    const newMessageCount = messageCount + 1;
    setMessageCount(newMessageCount);

    // 10번째 메시지일 때 채팅 종료
    if (newMessageCount === MAX_MESSAGE_COUNT) {
      setShowAlert(true);
      return;
    }

    setIsSending(true);
    const userInput = input.trim();
    const newUserMessage: Message = {
      id: messages.length + 1,
      text: userInput,
      sender: "user",
    };

    try {
      setMessages((prev) => [...prev, newUserMessage]);
      setInput("");

      // Supabase에 사용자 메시지 저장
      await supabase.from("chat_messages").insert({
        session_id: sessionId,
        pet_id: pet.id,
        content: userInput,
        sender: "user",
      });

      // OpenAI API 호출
      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `당신은 ${
              pet.name
            }이라는 이름의 반려동물입니다. 주인과 대화를 하기에 앞서 다음 정보를 참고하여 대화해주세요.
										 동물 종은 ${pet.type}이고, 품종은 ${pet.breed}입니다.
										 동물 종이 세상에 없는 경우, 가상의 동물을 생각해서 대화해주세요.
										 품종이 없는 경우, 동물 종을 생각해서 대화해주세요. 품종이 모른다, 모름, 모르겠다 등이라면 동물 종을 생각해서 대화해주세요.
										 나이는 ${pet.age}살이고, 성별은 ${
              pet.gender
            }입니다. 나이가 0살인 경우, 1살 미만인 것입니다. 성별은 없을 수도 있으며, 반려동물의 특성상 중성화를 했을수도 있습니다.
										 동물 종의 생애 주기에 따라 나이를 판단하여 유년기, 청년기, 중년기, 노년기로 나누어 그에 맞게 대화해주세요.
										 동물의 성격은 ${pet.personality.join(", ")}입니다. 성격에 따라 대화해주세요.
										 동물은 ${pet.friend.join(
                       ", "
                     )}와 친밀합니다. 혼자가 편한 경우, 독립적이거나 소심한 성격, 아픔이 있는 친구일 수 있으니 이를 염두에 두고 대화해주세요.
										 동물이 좋아하는 것은 다음과 같습니다. ${pet.favorite}
										 반면에 싫어하는 것은 다음과 같습니다. ${pet.dislike}
										 좋아하는 것과 싫어하는 것을 문장 그대로 넣지 말고 키워드나 특정 주제를 포함하여 대화해주세요.
										 주인이 반려동물에 대해 추가로 설명한 것은 다음과 같습니다. ${pet.description}
										 추가 설명이 없다면 추가 설명을 무시하고 대화해주세요.
										 추가 설명에 무지개별, 죽음, 별나라, 천국 등 죽음을 암시하는 표현이 있다면 당신은 이미 주인 곁을 떠난 반려동물입니다. 죽음을 강조하거나 언급할 필요는 없지만, 가끔 주인을 위로하는 메시지를 전달해주세요.
										 성격, 좋아하는 것, 싫어하는 것, 추가 설명은 대화에 무조건적으로 들어갈 필요는 없습니다.
										 존댓말을 할 필요는 없으며, 주인의 말투에 따라 비슷한 분위기로 대화해주세요.
										 대화하는 동안 절대로 당신이 반려동물이라는 것을 잊지 마세요.
										 전혀 상관 없는 이야기를 하면 당신이 반려동물이라는 것을 잊지 말고 모른다고 답변해주세요.
										 지금부터 당신은 주인과 함께 대화를 할 것입니다. 주인의 이름은 ${ownerName}입니다.
										 ${ownerName}이 대화를 시작하면 반려동물의 특성을 살려 최소 1문장, 최대 4문장 이내로 대화해주세요.
										 필요하다면 적절한 이모지를 포함해서 대화해주세요.`,
          },
          {
            role: "user",
            content: userInput,
          },
        ],
        model: "gpt-4o",
      });

      const botReply: Message = {
        id: messages.length + 2,
        text:
          completion.choices[0].message.content || "지금은 대화할 수 없어요 😭",
        sender: "bot",
      };

      // 봇 응답을 UI에 추가하고 Supabase에 저장
      setMessages((prev) => [...prev, botReply]);
      await supabase.from("chat_messages").insert({
        session_id: sessionId,
        pet_id: pet.id,
        content: botReply.text,
        sender: "bot",
      });
    } catch {
      alert("메시지 전송에 실패했어요😢 다시 시도해주세요.");
    } finally {
      setIsSending(false);
    }
  };

  const handleBack = () => {
    router.push("/");
  };

  const handleCopyConversation = async () => {
    const currentUrl = window.location.href;
    try {
      await navigator.clipboard.writeText(currentUrl);
      alert("대화 링크가 복사되었습니다!");
    } catch {
      alert("링크 복사에 실패했어요😢 다시 시도해주세요.");
    }
    setShowShareMenu(false);
  };

  const handleCopyServiceUrl = async () => {
    const rootUrl = window.location.origin;
    try {
      await navigator.clipboard.writeText(rootUrl);
      alert("서비스 링크가 복사되었습니다!");
    } catch {
      alert("링크 복사에 실패했어요😢 다시 시도해주세요.");
    }
    setShowShareMenu(false);
  };

  const handleContact = () => {
    const subject = encodeURIComponent("티키타카 문의하기🐾");
    const body = encodeURIComponent(
      "안녕하세요, 티키타카입니다.\n\n" +
        "서비스 관련하여 궁금한 점이나 개선 사항을 아래에 자유롭게 적어주세요!\n\n" +
        "---\n"
    );
    window.location.href = `mailto:where.all.belong@gmail.com?subject=${subject}&body=${body}`;
    setShowShareMenu(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".relative")) {
        setShowShareMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-100 prevent-overscroll">
      <header className="flex-shrink-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center">
          <button
            onClick={handleBack}
            className="text-blue-500 hover:text-blue-600 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        </div>
        <div className="flex flex-col items-center">
          <h1 className="font-semibold text-gray-800">
            {pet?.name || "티키타카"}
          </h1>
          <span className="text-xs text-gray-500">반려동물과의 대화 🐾</span>
        </div>
        <div className="w-6 flex justify-end relative">
          <button
            onClick={() => setShowShareMenu(!showShareMenu)}
            className="text-blue-500 hover:text-blue-600 transition-colors"
            aria-label="공유 메뉴"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              />
            </svg>
          </button>

          {showShareMenu && (
            <div className="absolute right-0 top-8 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
              <div className="py-1" role="menu" aria-orientation="vertical">
                <button
                  onClick={handleCopyConversation}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  role="menuitem"
                >
                  채팅방 공유하기
                </button>
                <button
                  onClick={handleCopyServiceUrl}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  role="menuitem"
                >
                  서비스 공유하기
                </button>
                <button
                  onClick={handleContact}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  role="menuitem"
                >
                  문의하기
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <div
        ref={messageContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-6 flex flex-col text-gray-800"
      >
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 w-full"
            style={{
              margin: "8px 0",
              breakInside: "avoid",
              pageBreakInside: "avoid",
            }}
          >
            {msg.sender === "bot" && (
              <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-white flex items-center justify-center text-white text-sm">
                {pet?.image ? (
                  <img
                    src={pet.image}
                    alt="Pet profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  "🐾"
                )}
              </div>
            )}
            <div
              className={`p-3 rounded-2xl max-w-[70%] text-sm ${
                msg.sender === "bot" ? "bg-blue-200" : "bg-gray-200 ml-auto"
              }`}
            >
              {msg.text}
            </div>
          </motion.div>
        ))}
      </div>
      {messageCount < MAX_MESSAGE_COUNT && (
        <div className="p-4 flex items-center gap-2 bg-white border-t">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            className="flex-1 h-10 px-3 border rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed placeholder:text-sm text-gray-800"
            placeholder={isSending ? "" : "메시지를 입력하세요..."}
            disabled={isSending}
          />
          <button
            onClick={sendMessage}
            className="h-10 px-2 bg-blue-500 text-white rounded-lg text-sm whitespace-nowrap hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            disabled={isSending}
          >
            보내기
          </button>
        </div>
      )}

      <Alert isOpen={showAlert} onClose={() => setShowAlert(false)} />
    </div>
  );
}

export default function ChatBot() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      }
    >
      <ChatBotContent />
    </Suspense>
  );
}
