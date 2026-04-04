import HeroEditor from "./HeroEditor";
import MissionEditor from "./MissionEditor";
import ProcessEditor from "./ProcessEditor";
import FounderStoryEditor from "./FounderStoryEditor";
import TeamEditor from "./TeamEditor";
import ContributorsEditor from "./ContributorsEditor";
import GetInvolvedEditor from "./GetInvolvedEditor";
import SupportersEditor from "./SupportersEditor";

export const sectionEditors = {
  hero: HeroEditor,
  mission: MissionEditor,
  process: ProcessEditor,
  founderStory: FounderStoryEditor,
  team: TeamEditor,
  contributors: ContributorsEditor,
  getInvolved: GetInvolvedEditor,
  supporters: SupportersEditor,
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
