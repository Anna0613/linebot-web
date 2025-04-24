import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Navbar2 from "@/components/LoginHome/Navbar2";
import Footer from "@/components/Index/Footer";
import { useNavigate } from "react-router-dom";

interface User {
  line_id: string;
  display_name: string;
  picture_url: string;
  email?: string;
  isLineUser: boolean;
}

const Setting: React.FC = () => {
  const stored = localStorage.getItem("user");
  const defaultUser: User = stored
    ? JSON.parse(stored)
    : { line_id: "", display_name: "", picture_url: "", email: "", isLineUser: true };

  const [user, setUser] = useState<User>(defaultUser);
  const [displayName, setDisplayName] = useState(user.display_name);
  const [email, setEmail] = useState(user.email || "");
  const [userImage, setUserImage] = useState(user.picture_url);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === "string") {
          setUserImage(event.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setUserImage("");
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/index2";
  };

  const handleDeleteAccount = () => {
    if (confirm("一旦刪除您的帳戶，就無法恢復。請確定。")) {
      alert("帳號已刪除（示意）");
      localStorage.clear();
      window.location.href = "/";
    }
  };

  return (
    <>
      <Navbar2 user={user} />
      <div className="max-w-3xl mx-auto p-6 pt-32 space-y-8 pb-16">
        <h2 className="text-3xl font-bold mb-6">設定</h2>

        <section>
          <h3 className="text-lg font-semibold mb-2">個人檔案照片</h3>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              {userImage ? (
                <img src={userImage} alt="user" className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-300 flex items-center justify-center text-sm text-gray-600">
                  無照片
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {userImage && (
                <Button className="rounded-md h-9" variant="destructive" size="sm" onClick={handleRemoveImage}>移除照片</Button>
              )}
              <Button className="rounded-md h-9" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>變更照片</Button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            </div>
          </div>
        </section>

        <hr className="border-t border-gray-300" />

        <section className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">名稱</h3>
            <Label htmlFor="displayName">{user.display_name}</Label>
            <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <Button className="mt-6 rounded-md h-9">編輯</Button>
        </section>

        <hr className="border-t border-gray-300" />

        <section className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">電子郵件</h3>
            <Label htmlFor="email">{user.email}</Label>
            <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={user.isLineUser} />
          </div>
          <Button className="mt-6 rounded-md h-9" disabled={user.isLineUser}>編輯</Button>
        </section>

        <hr className="border-t border-gray-300" />

        <section className="space-y-2">
          <h3 className="text-lg font-semibold">已連結的社交帳號</h3>
          <p className="text-sm text-gray-500">你用於登入 LINE Bot 製作輔助系統 的服務</p>
          <div className="bg-gray-100 p-4 rounded flex justify-between items-center">
            <div className="flex items-center gap-2">
              <img src="/專題圖片/line-logo.svg" alt="LINE" className="w-6 h-6" />
              <span className="font-medium">LINE</span>
            </div>
            <Button className="rounded-md h-9" variant="outline" size="sm">中斷連結</Button>
          </div>
          <div className="text-sm text-gray-500 ml-8">{user.display_name}</div>
        </section>

        <hr className="border-t border-gray-300" />

        <section className="space-y-2">
          <h3 className="text-lg font-semibold">密碼</h3>
          <p className="text-sm text-gray-500">
            若要第一次為帳號新增密碼，你必須透過密碼重設頁面，我們才能驗證你的身分。
          </p>
          <Button className="rounded-md h-9" variant="outline" onClick={() => navigate("/forgetthepassword")}>前往密碼重設</Button>
        </section>

        <hr className="border-t border-gray-300" />

        <section className="space-y-4 pb-0">
          <h3 className="text-lg font-bold text-red-600">刪除帳戶</h3>
          <p className="text-sm text-gray-500">一旦刪除您的帳戶，就無法恢復。請確定。</p>
          <Button className="rounded-md h-9" variant="destructive" onClick={handleDeleteAccount}>刪除帳號</Button>
        </section>
      </div>
      <Footer />
    </>
  );
};

export default Setting;