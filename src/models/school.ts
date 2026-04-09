export interface Curriculum {
  genesis: Lessons;
  characters: Lessons;
}

export interface Lessons {
  lessons: Lesson[];
}

type VideoType = "short" | "movie";
export interface Lesson {
  id: string;
  type?: VideoType;
  title: string;
  course: Course;
  summary: string;
  videoId: string;
  slug: string;
}

export enum Course {
  Genesis = "genesis",
  Characters = "characters",
}

export function getCourses(): Course[] {
  return Object.values(Course);
}
