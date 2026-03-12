
import {
  LayoutDashboard, FileText, FileEdit, Package, Briefcase, Megaphone, Tag,
  Image, Video, Users, Shield, Search, FolderTree, Hash,
  Languages, MessageSquare as MessageSquareQuote, MapPin, Inbox, List,
  Menu, Puzzle, Box, Database, Lock, Palette, FolderOpen, Settings2,
  Layers, ShieldCheck, FileClock, Mail, MailOpen, Smartphone, Bell, Settings,
  Cpu, ShoppingCart, CreditCard
} from 'lucide-react';

// Map string keys to Lucide components
export const adminIcons = {
  LayoutDashboard,
  FileText,
  FileEdit,
  Package,
  Briefcase,
  Megaphone,
  Tag,
  Image,
  Video,
  Users,
  Shield,
  Search,
  FolderTree,
  Hash,
  Languages,
  MessageSquareQuote,
  MapPin,
  Inbox,
  List,
  Menu,
  Puzzle,
  Box,
  Database,
  Lock,
  Palette,
  FolderOpen,
  Settings2,
  Layers,
  ShieldCheck,
  FileClock,
  Mail,
  MailOpen,
  Smartphone,
  Bell,
  Settings,
  Cpu,
  ShoppingCart,
  CreditCard
};

export const getIconComponent = (iconName) => {
  return adminIcons[iconName] || Puzzle;
};
