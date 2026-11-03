import { Course, getCourses, type Curriculum, type Lesson } from "@/models/school";
import { toSlug } from "@/utils/to-slug";

/** Recognize public course parameters without casting unknown strings into curriculum keys. */
export function isSchoolCourse(value: unknown): value is Course {
  return typeof value === "string" && getCourses().some((course) => course === value);
}

/** Keep localized lesson content while resolving its stable URL slug from the matching English ID. */
export function createSchoolLessons(localized: Curriculum, english: Curriculum): Record<Course, Lesson[]> {
  return Object.fromEntries(getCourses().map((course) => {
    const canonical = new Map(english[course].lessons.map((lesson) => [lesson.id, lesson]));
    if (canonical.size !== english[course].lessons.length) throw new Error("Canonical school lesson IDs must be unique within a course");
    const lessons = localized[course].lessons.map((lesson) => {
      const original = canonical.get(lesson.id);
      if (!original) throw new Error("Localized school lesson is missing its canonical English ID");
      return { ...lesson, slug: toSlug(original.title) };
    });
    return [course, lessons];
  })) as Record<Course, Lesson[]>;
}

/** Resolve known URLs and retain the existing first-lesson defaults for unsupported parameters. */
export function resolveSchoolSelection(lessons: Record<Course, readonly Lesson[]>, params: { course: string | null; lesson: string | null }) {
  const course = isSchoolCourse(params.course) ? params.course : Course.Genesis;
  const candidates = lessons[course];
  if (!candidates.length) throw new Error("Selected school curriculum has no lessons");
  const lesson = candidates.find((item) => item.slug === params.lesson) ?? candidates[0];
  return { course, lesson };
}

/** Advance within the selected curriculum, preserving the existing wrap behavior. */
export function adjacentSchoolLesson(lessons: readonly Lesson[], currentId: string, direction: "previous" | "next"): Lesson {
  const index = lessons.findIndex((lesson) => lesson.id === currentId);
  if (index < 0) throw new Error("Selected school lesson must belong to its curriculum");
  return lessons[(index + (direction === "previous" ? -1 : 1) + lessons.length) % lessons.length];
}
