import { ActivityRepository } from './activity.repository';

export class ActivityService {
  constructor(private readonly activityRepository = new ActivityRepository()) {}

  findBySlug = async (slug: string) => {
    return this.activityRepository.findBySlug(slug);
  };

  startBySlug = async (slug: string) => {
    const activity = await this.activityRepository.findBySlug(slug);

    if (!activity) {
      return null;
    }

    const labels = ['A', 'B', 'C', 'D'];

    return {
      ...activity,
      questions: this.shuffleArray(activity.questions).map((question) => ({
        ...question,
        options: this.shuffleArray(question.options).map((option, index) => ({
          ...option,
          label: labels[index] ?? option.label,
        })),
      })),
    };
  };

  private shuffleArray = <T>(items: T[]): T[] => {
    const shuffled = [...items];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));

      [shuffled[index], shuffled[randomIndex]] = [
        shuffled[randomIndex],
        shuffled[index],
      ];
    }

    return shuffled;
  };
}