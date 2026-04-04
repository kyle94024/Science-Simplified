import HeroSection from "./HeroSection";
import MissionSection from "./MissionSection";
import ProcessSection from "./ProcessSection";
import FounderStorySection from "./FounderStorySection";
import TeamSection from "./TeamSection";
import ContributorsSection from "./ContributorsSection";
import GetInvolvedSection from "./GetInvolvedSection";
import SupportersSection from "./SupportersSection";

export const sectionRegistry = {
  hero: HeroSection,
  mission: MissionSection,
  process: ProcessSection,
  founderStory: FounderStorySection,
  team: TeamSection,
  contributors: ContributorsSection,
  getInvolved: GetInvolvedSection,
  supporters: SupportersSection,
};

export const sectionLabels = {
  hero: "Hero",
  mission: "Mission Statement",
  process: "How It Works",
  founderStory: "Founder Story",
  team: "Team Members",
  contributors: "Scientific Contributors",
  getInvolved: "Get Involved",
  supporters: "Community Supporters",
};
