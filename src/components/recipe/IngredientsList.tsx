import { Recipe } from '@/types/database';

interface IngredientsListProps {
    ingredients: NonNullable<Recipe['ingredients']>;
}

export default function IngredientsList({ ingredients }: IngredientsListProps) {
    if (!ingredients || ingredients.length === 0) return null;

    return (
        <div className="sticky top-32">
            <h2 className="text-2xl font-bold text-white mb-8 tracking-tight">
                Ingrediënten
            </h2>
            <ul className="space-y-4">
                {ingredients.map((ing, idx) => (
                    <li key={idx} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 group hover:border-white/10 transition-colors">
                        <span className="text-white/70 font-medium text-lg">
                            {typeof ing === 'string' ? ing : ing.item}
                        </span>
                        {typeof ing !== 'string' && (ing.amount || ing.unit) && (
                            <span className="text-white font-bold text-lg text-right">
                                {ing.amount} {ing.unit}
                            </span>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
