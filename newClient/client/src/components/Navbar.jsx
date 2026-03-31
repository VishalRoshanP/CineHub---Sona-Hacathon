import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Film, User, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useFavorites } from "@/contexts/FavoritesContext";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { favCount } = useFavorites();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[#0B0B0F]/80 backdrop-blur-2xl border-b border-[#D4AF37]/10 shadow-lg shadow-black/20"
          : "bg-gradient-to-b from-[#0B0B0F]/60 to-transparent backdrop-blur-sm border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group cursor-pointer">
          <motion.div
            whileHover={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#D4AF37] to-[#F0D060] rounded-xl blur-sm opacity-60 group-hover:opacity-100 transition duration-300" />
            <div className="relative bg-[#0B0B0F]/80 backdrop-blur-sm px-2.5 py-2 rounded-xl border border-white/10">
              <Film className="w-5 h-5 text-[#D4AF37]" />
            </div>
          </motion.div>
          <span className="hidden sm:inline text-lg font-extrabold tracking-tight text-gradient">
            CineHub
          </span>
        </Link>

        {/* Nav Links */}
        <div className="flex items-center gap-1">
          <Link href="/">
            <motion.span
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative px-4 py-2 text-sm font-medium text-white rounded-lg hover:bg-white/5 transition-colors duration-200"
            >
              Discover
              <motion.div
                layoutId="nav-indicator"
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-gradient-to-r from-[#D4AF37] to-[#F0D060] rounded-full shadow-[0_0_8px_rgba(212,175,55,0.5)]"
              />
            </motion.span>
          </Link>

          <a href="#trending">
            <motion.span
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 text-sm font-medium text-gray-400 rounded-lg hover:text-white hover:bg-white/5 transition-colors duration-200"
            >
              Trending
            </motion.span>
          </a>

          <Link href="/favorites">
            <motion.span
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative px-4 py-2 text-sm font-medium text-gray-400 rounded-lg hover:text-pink-400 hover:bg-white/5 transition-colors duration-200 flex items-center gap-1.5"
            >
              <Heart className="w-3.5 h-3.5" />
              Favorites
              {favCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 text-[9px] font-bold bg-pink-500 text-white rounded-full flex items-center justify-center">
                  {favCount > 9 ? "9+" : favCount}
                </span>
              )}
            </motion.span>
          </Link>

          <div className="w-px h-5 bg-white/8 mx-2 hidden sm:block" />

          {/* Profile Avatar */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#F0D060] flex items-center justify-center border border-white/10 hover:border-white/20 transition-colors shadow-lg shadow-[#D4AF37]/15"
          >
            <User className="w-4 h-4 text-white" />
          </motion.button>
        </div>
      </div>
    </motion.nav>
  );
}

