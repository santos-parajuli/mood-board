"use client";
import { Badge } from "../ui/badge";
import useMoodboardStore from "@/lib/store/moodboardstore";
import DownloadButton from "./downloadbutton";
import Settings from "./settings";
import Image from "next/image";

const Header = () => {
  const { region } = useMoodboardStore();

  return (
    <div id="header" className="border-b p-5">
      <div className="m-auto flex max-w-[90%] flex-row items-start justify-between md:items-center">
        <div className="flex items-center gap-2">
          <Image
            src="/toniclogo.png"
            alt="Tonic Living"
            width={100}
            height={30}
            loading="eager"
            className="h-auto w-auto"
          />
          <span className="font-sans text-lg font-light text-primary">
            Moodboard
          </span>
          <sup>
            {" "}
            <Badge
              className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums"
              variant="outline"
            >
              {region}
            </Badge>
          </sup>
        </div>
        <div className="flex items-center gap-4">
          <Settings />
          <DownloadButton />
        </div>
      </div>
    </div>
  );
};

export default Header;
