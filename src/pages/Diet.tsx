import { useState } from 'react';
import { motion } from 'motion/react';
import { useAppStore, Meal } from '../store/useAppStore';
import { Utensils, Flame, Droplet, Beef, Wheat, RefreshCw } from 'lucide-react';
import { generateAlternativeMeal } from '../services/geminiService';

export default function Diet() {
  const { diet, profile, swapMeal } = useAppStore();
  const [loadingMealId, setLoadingMealId] = useState<string | null>(null);

  if (!diet) return null;

  const handleSwap = async (meal: Meal) => {
    if (!profile) return;
    setLoadingMealId(meal.id);
    try {
      const newMeal = await generateAlternativeMeal(meal, profile);
      swapMeal(meal.id, newMeal);
    } catch (error) {
      console.error('Error swapping meal:', error);
      alert('Hubo un error al cambiar la comida.');
    } finally {
      setLoadingMealId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] p-6 pb-32">
      <header className="mb-8 mt-4">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Utensils className="text-[#39ff14]" size={32} />
          Tu Dieta
        </h1>
        <p className="text-gray-400 font-mono text-sm">Objetivo: {diet.dailyCalories} kcal</p>
      </header>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[#121212] border border-[#262626] rounded-3xl p-4 flex flex-col items-center justify-center text-center">
          <Beef className="text-[#ff3939] mb-2" size={24} />
          <span className="text-xl font-bold text-white">{diet.macros.protein}g</span>
          <span className="text-xs text-gray-500 font-mono">Proteína</span>
        </div>
        <div className="bg-[#121212] border border-[#262626] rounded-3xl p-4 flex flex-col items-center justify-center text-center">
          <Wheat className="text-[#ffb839] mb-2" size={24} />
          <span className="text-xl font-bold text-white">{diet.macros.carbs}g</span>
          <span className="text-xs text-gray-500 font-mono">Carbos</span>
        </div>
        <div className="bg-[#121212] border border-[#262626] rounded-3xl p-4 flex flex-col items-center justify-center text-center">
          <Droplet className="text-[#39a6ff] mb-2" size={24} />
          <span className="text-xl font-bold text-white">{diet.macros.fat}g</span>
          <span className="text-xs text-gray-500 font-mono">Grasas</span>
        </div>
      </div>

      <div className="space-y-4">
        {diet.meals.map((meal, index) => (
          <motion.div
            key={meal.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-[#121212] border border-[#262626] rounded-3xl p-5 relative overflow-hidden group hover:border-[#39ff14]/50 transition-colors"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#39ff14]/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-[#39ff14]/10 transition-colors" />
            
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  {meal.name}
                  <span className="text-xs font-mono bg-[#262626] text-gray-300 px-2 py-1 rounded-full">
                    {meal.time}
                  </span>
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleSwap(meal)}
                  disabled={loadingMealId === meal.id}
                  className="p-2 bg-[#262626] rounded-full text-gray-400 hover:text-[#39ff14] transition-colors disabled:opacity-50"
                  title="Cambiar comida"
                >
                  <RefreshCw size={16} className={loadingMealId === meal.id ? 'animate-spin' : ''} />
                </button>
                <div className="flex items-center gap-1 text-[#39ff14] font-mono font-bold glow-text">
                  <Flame size={16} />
                  {meal.calories}
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-400 mb-4 relative z-10">{meal.description}</p>

            <div className="flex gap-4 text-xs font-mono text-gray-500 relative z-10">
              <span>P: {meal.protein}g</span>
              <span>C: {meal.carbs}g</span>
              <span>G: {meal.fat}g</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
